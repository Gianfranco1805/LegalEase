import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

SCRIPT_DIR = Path(__file__).resolve().parent
ENV_CANDIDATES = [
    SCRIPT_DIR / ".env",
    SCRIPT_DIR / ".env.txt",
    SCRIPT_DIR.parent / ".env",
    SCRIPT_DIR.parent / ".env.txt",
]

for env_path in ENV_CANDIDATES:
    if env_path.exists():
        load_dotenv(env_path)
        break

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SOURCE_BUCKET = os.getenv("SUPABASE_BUCKET", "legalDocs")
METADATA_BUCKET = os.getenv("SUPABASE_METADATA_BUCKET", "legalDocsData")
PAGE_SIZE = int(os.getenv("METADATA_SYNC_PAGE_SIZE", "200"))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    searched_paths = ", ".join(str(path) for path in ENV_CANDIDATES)
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
        f"Checked: {searched_paths}"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def slugify_tag(value: str) -> str:
    return "-".join(value.strip().lower().split())


def build_tags(document: dict, source_org: str | None) -> list[str]:
    values = [
        document.get("jurisdiction_level"),
        document.get("state_code"),
        document.get("category"),
        document.get("subcategory"),
        document.get("doc_kind"),
        document.get("language"),
        source_org,
    ]
    tags = []
    seen = set()
    for value in values:
        if not value:
            continue
        tag = slugify_tag(str(value))
        if tag and tag not in seen:
            seen.add(tag)
            tags.append(tag)
    if document.get("is_fillable_pdf"):
        tags.append("fillable-pdf")
    return tags


def metadata_storage_path(storage_path: str) -> str:
    if "." in storage_path.rsplit("/", 1)[-1]:
        base, _ext = storage_path.rsplit(".", 1)
        return f"{base}.json"
    return f"{storage_path}.json"


def fetch_source_map() -> dict[int, dict]:
    source_map: dict[int, dict] = {}
    offset = 0
    while True:
        res = (
            supabase.table("document_sources")
            .select("id,name,organization,base_url")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        rows = res.data or []
        for row in rows:
            source_map[row["id"]] = row
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return source_map


def fetch_document_text_map(document_ids: list[int]) -> dict[int, dict]:
    if not document_ids:
        return {}
    res = (
        supabase.table("document_text")
        .select("document_id,extracted_text,extraction_method")
        .in_("document_id", document_ids)
        .execute()
    )
    rows = res.data or []
    return {row["document_id"]: row for row in rows}


def build_metadata_payload(document: dict, document_text: dict | None, source_row: dict | None) -> dict:
    source_org = source_row["organization"] if source_row else None
    return {
        "document_id": document["id"],
        "title": document.get("title"),
        "source_url": document.get("original_file_url"),
        "storage_path": document.get("storage_path"),
        "file_type": document.get("file_ext") or document.get("mime_type"),
        "file_size": document.get("file_size_bytes"),
        "jurisdiction": document.get("jurisdiction_level"),
        "category": document.get("category"),
        "hash": document.get("sha256_hash"),
        "page_count": document.get("page_count"),
        "extracted_text": (document_text or {}).get("extracted_text"),
        "detected_fillable_pdf": document.get("is_fillable_pdf"),
        "source_organization": source_org,
        "published_date": document.get("published_date"),
        "revision_label": document.get("revision_label"),
        "tags": build_tags(document, source_org),
        "scrape_status": document.get("scrape_status"),
        "source_page_url": document.get("source_page_url"),
        "storage_bucket": document.get("storage_bucket"),
        "metadata_bucket": METADATA_BUCKET,
        "extraction_status": document.get("extraction_status"),
        "extraction_method": (document_text or {}).get("extraction_method"),
        "mime_type": document.get("mime_type"),
        "source_name": source_row["name"] if source_row else None,
        "source_base_url": source_row["base_url"] if source_row else None,
    }


def upload_metadata(storage_path: str, payload: dict):
    data = json.dumps(payload, ensure_ascii=True, indent=2).encode("utf-8")
    supabase.storage.from_(METADATA_BUCKET).upload(
        path=storage_path,
        file=data,
        file_options={
            "content-type": "application/json",
            "upsert": "true",
        },
    )


def fetch_documents_page(offset: int) -> list[dict]:
    res = (
        supabase.table("legal_documents")
        .select(
            "id,source_id,title,jurisdiction_level,state_code,category,subcategory,"
            "doc_kind,language,source_page_url,original_file_url,storage_bucket,"
            "storage_path,file_ext,mime_type,file_size_bytes,sha256_hash,"
            "is_fillable_pdf,page_count,extraction_status,scrape_status,"
            "published_date,revision_label"
        )
        .eq("storage_bucket", SOURCE_BUCKET)
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1)
        .execute()
    )
    return res.data or []


def main():
    print(
        f"[START] source_bucket={SOURCE_BUCKET} "
        f"metadata_bucket={METADATA_BUCKET} page_size={PAGE_SIZE}"
    )
    source_map = fetch_source_map()
    print(f"[INFO] Loaded source rows: {len(source_map)}")

    offset = 0
    uploaded = 0
    processed = 0

    while True:
        documents = fetch_documents_page(offset)
        if not documents:
            break

        text_map = fetch_document_text_map([doc["id"] for doc in documents])
        for document in documents:
            document_text = text_map.get(document["id"])
            source_row = source_map.get(document.get("source_id"))
            payload = build_metadata_payload(document, document_text, source_row)
            target_path = metadata_storage_path(document["storage_path"])
            upload_metadata(target_path, payload)
            uploaded += 1
            processed += 1
            print(
                f"[OK] {processed} document_id={document['id']} "
                f"metadata_path={target_path}"
            )

        if len(documents) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    print(f"[DONE] metadata_uploaded={uploaded}")


if __name__ == "__main__":
    main()
