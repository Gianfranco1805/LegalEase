import os
import re
import io
import sys
import time
import hashlib
import mimetypes
import html as html_lib
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client
from PyPDF2 import PdfReader
from docx import Document

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
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "legalDocs")

NATIONAL_TARGET = int(os.getenv("NATIONAL_TARGET", "500"))
FLORIDA_TARGET = int(os.getenv("FLORIDA_TARGET", "6"))
MAX_FILES = int(os.getenv("MAX_FILES", str(NATIONAL_TARGET + FLORIDA_TARGET)))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    searched_paths = ", ".join(str(path) for path in ENV_CANDIDATES)
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. "
        f"Checked: {searched_paths}"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; LegalDocsScraper/1.0; +local-script)"
}

US_COURTS_START_PAGES = [
    "https://www.uscourts.gov/forms-rules/forms",
]

FLORIDA_START_PAGES = [
    "https://supremecourt.flcourts.gov/Practice-Procedures/Court-Forms",
]

DISCOVERY_LIMIT_PER_SOURCE_PAGE = 500
REQUEST_TIMEOUT = 30


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "file"


def get_extension_from_url(url: str) -> str:
    path = urlparse(url).path.lower()
    for ext in ALLOWED_EXTENSIONS:
        if path.endswith(ext):
            return ext
    return ""


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or "/"
    ext = get_extension_from_url(url)
    query = parsed.query if ext in ALLOWED_EXTENSIONS else ""
    return urlunparse((parsed.scheme, parsed.netloc, path, "", query, ""))


def document_identity_key(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.path.lower()}?{parsed.query.lower()}"


def infer_doc_kind(title: str, href: str, context_text: str = "") -> str:
    combined = f"{title} {href} {context_text}".lower()
    if "instruction" in combined or "instructions" in combined or "instructions for" in combined:
        return "instruction"
    if "form" in combined or "ao " in combined or "b " in combined or "fl-" in combined:
        return "form"
    return "unknown"


def infer_category(text: str, jurisdiction: str) -> str:
    t = text.lower()
    if "bankruptcy" in t:
        return "bankruptcy"
    if "criminal" in t:
        return "criminal"
    if "civil" in t:
        return "civil"
    if "family" in t or "domestic" in t:
        return "family"
    if "probate" in t:
        return "probate"
    if "juvenile" in t:
        return "juvenile"
    if jurisdiction == "florida":
        return "florida_forms"
    return "national_forms"


def get_source_id(name: str) -> int:
    res = supabase.table("document_sources").select("id").eq("name", name).limit(1).execute()
    if not res.data:
        raise RuntimeError(f"Missing source row: {name}")
    return res.data[0]["id"]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def already_exists_by_hash(file_hash: str) -> bool:
    res = supabase.table("legal_documents").select("id").eq("sha256_hash", file_hash).limit(1).execute()
    return bool(res.data)


def already_exists_by_url(url: str) -> bool:
    res = supabase.table("legal_documents").select("id").eq("original_file_url", url).limit(1).execute()
    return bool(res.data)


def extract_pdf_text_and_meta(data: bytes):
    try:
        reader = PdfReader(io.BytesIO(data))
        text_parts = []
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or "")
            except Exception:
                text_parts.append("")
        text = "\n".join(text_parts).strip()
        is_fillable = "/AcroForm" in str(reader.trailer)
        return {
            "text": text,
            "page_count": len(reader.pages),
            "is_fillable_pdf": is_fillable,
            "status": "success" if text else "partial",
            "method": "pdf",
        }
    except Exception:
        return {
            "text": "",
            "page_count": None,
            "is_fillable_pdf": False,
            "status": "failed",
            "method": "none",
        }


def extract_docx_text(data: bytes):
    try:
        document = Document(io.BytesIO(data))
        text = "\n".join(p.text for p in document.paragraphs).strip()
        return {
            "text": text,
            "page_count": None,
            "is_fillable_pdf": False,
            "status": "success" if text else "partial",
            "method": "docx",
        }
    except Exception:
        return {
            "text": "",
            "page_count": None,
            "is_fillable_pdf": False,
            "status": "failed",
            "method": "none",
        }


def extract_text_and_meta(data: bytes, ext: str):
    if ext == ".pdf":
        return extract_pdf_text_and_meta(data)
    if ext == ".docx":
        return extract_docx_text(data)
    return {
        "text": "",
        "page_count": None,
        "is_fillable_pdf": False,
        "status": "failed",
        "method": "none",
    }


def upload_to_storage(storage_path: str, data: bytes, mime_type: str):
    supabase.storage.from_(SUPABASE_BUCKET).upload(
        path=storage_path,
        file=data,
        file_options={
            "content-type": mime_type,
            "upsert": "false",
        },
    )


def insert_document(metadata: dict, extracted_text: str, extraction_method: str):
    doc_res = supabase.table("legal_documents").insert(metadata).execute()
    if not doc_res.data:
        raise RuntimeError("Failed to insert legal_documents row")
    document_id = doc_res.data[0]["id"]

    supabase.table("document_text").insert({
        "document_id": document_id,
        "extracted_text": extracted_text,
        "extraction_method": extraction_method,
    }).execute()

    return document_id


def fetch_page(url: str):
    r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    return r.text


def fetch_file(url: str):
    r = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type")


def is_same_domain_family(base_url: str, candidate_url: str, jurisdiction: str) -> bool:
    host = urlparse(candidate_url).netloc.lower()
    if jurisdiction == "national":
        return "uscourts.gov" in host
    if jurisdiction == "florida":
        return "flcourts.gov" in host
    return False


def is_relevant_page_link(base_url: str, candidate_url: str, anchor_text: str, href: str, jurisdiction: str) -> bool:
    if not is_same_domain_family(base_url, candidate_url, jurisdiction):
        return False

    joined_text = f"{anchor_text} {href}".lower()
    candidate_path = urlparse(candidate_url).path.lower()

    if jurisdiction == "national":
        return candidate_path.startswith("/forms-rules/forms")

    if jurisdiction == "florida":
        keywords = [
            "form", "forms", "practice", "procedure", "court-forms", "pdf",
            "indigency", "pauperis", "template", "packet", "manual"
        ]
        return any(k in joined_text or k in candidate_path for k in keywords)

    return False


def discover_links_from_page(page_url: str, jurisdiction: str):
    try:
        html = fetch_page(page_url)
    except Exception as e:
        print(f"[WARN] Failed page: {page_url} -> {e}")
        return [], []

    soup = BeautifulSoup(html, "html.parser")
    files = []
    more_pages = []

    anchors = soup.find_all("a", href=True)
    seen = set()

    for a in anchors:
        href = a.get("href", "").strip()
        text = a.get_text(" ", strip=True)
        full_url = normalize_url(urljoin(page_url, href))
        low = full_url.lower()

        if full_url in seen:
            continue
        seen.add(full_url)

        ext = get_extension_from_url(full_url)
        context_text = ""
        parent = a.parent.get_text(" ", strip=True) if a.parent else ""
        if parent:
            context_text = parent[:500]

        if ext in ALLOWED_EXTENSIONS:
            doc_kind = infer_doc_kind(text, full_url, context_text)
            category = infer_category(f"{text} {context_text}", jurisdiction)

            files.append({
                "title": text or os.path.basename(urlparse(full_url).path),
                "file_url": full_url,
                "ext": ext,
                "doc_kind": doc_kind,
                "category": category,
                "source_page_url": page_url,
            })
        else:
            if is_relevant_page_link(page_url, full_url, text, href, jurisdiction):
                more_pages.append(full_url)

    embedded_files = discover_embedded_file_links(page_url, html, jurisdiction)
    for item in embedded_files:
        if item["file_url"] in seen:
            continue
        seen.add(item["file_url"])
        files.append(item)

    return files[:DISCOVERY_LIMIT_PER_SOURCE_PAGE], more_pages[:DISCOVERY_LIMIT_PER_SOURCE_PAGE]


def discover_embedded_file_links(page_url: str, html: str, jurisdiction: str):
    search_blob = html_lib.unescape(html).replace("\\/", "/")
    search_blob = search_blob.replace("\\u003c", "<").replace("\\u003e", ">")
    url_pattern = re.compile(
        r"(https?://[^\s\"'<>]+?\.(?:pdf|doc|docx)(?:\?[^\s\"'<>]*)?"
        r"|/[^\s\"'<>]+?\.(?:pdf|doc|docx)(?:\?[^\s\"'<>]*)?)",
        re.IGNORECASE,
    )

    seen = set()
    files = []
    for match in url_pattern.findall(search_blob):
        candidate_url = match.strip().replace("\\", "")
        if candidate_url.startswith("/http"):
            candidate_url = candidate_url[1:]
        full_url = normalize_url(urljoin(page_url, candidate_url))
        if full_url in seen:
            continue
        seen.add(full_url)

        ext = get_extension_from_url(full_url)
        if ext not in ALLOWED_EXTENSIONS:
            continue
        if not is_same_domain_family(page_url, full_url, jurisdiction):
            continue

        filename = os.path.basename(urlparse(full_url).path)
        title = filename or "embedded-file"
        doc_kind = infer_doc_kind(title, full_url, "")
        category = infer_category(title, jurisdiction)

        files.append({
            "title": title,
            "file_url": full_url,
            "ext": ext,
            "doc_kind": doc_kind,
            "category": category,
            "source_page_url": page_url,
        })

    return files[:DISCOVERY_LIMIT_PER_SOURCE_PAGE]


def sort_candidate_key(item: dict):
    score = 0
    if item["doc_kind"] == "form":
        score -= 2
    elif item["doc_kind"] == "instruction":
        score -= 1
    return (score, item["title"].lower())


def safe_filename_from_title(title: str, ext: str):
    name = slugify(title)
    return f"{name}{ext}"


def guess_mime_type(ext: str, fallback_header: str | None):
    mime = mimetypes.types_map.get(ext.lower())
    if mime:
        return mime
    if fallback_header:
        return fallback_header.split(";")[0]
    return "application/octet-stream"


def create_scrape_run():
    res = supabase.table("scrape_runs").insert({
        "max_files": MAX_FILES,
        "national_target": NATIONAL_TARGET,
        "florida_target": FLORIDA_TARGET,
    }).execute()
    return res.data[0]["id"]


def update_scrape_run_progress(run_id: int, uploaded: int, skipped: int, failed: int, notes: str = ""):
    supabase.table("scrape_runs").update({
        "uploaded_count": uploaded,
        "skipped_duplicates": skipped,
        "failed_count": failed,
        "notes": notes,
    }).eq("id", run_id).execute()


def finish_scrape_run(run_id: int, uploaded: int, skipped: int, failed: int, notes: str = ""):
    supabase.table("scrape_runs").update({
        "finished_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "uploaded_count": uploaded,
        "skipped_duplicates": skipped,
        "failed_count": failed,
        "notes": notes,
    }).eq("id", run_id).execute()


def build_progress_note(counters: dict, stage: str, jurisdiction: str | None = None, detail: str = "") -> str:
    note = (
        f"{stage}; uploaded={counters['uploaded_total']}; "
        f"national={counters['national_uploaded']}/{NATIONAL_TARGET}; "
        f"florida={counters['florida_uploaded']}/{FLORIDA_TARGET}; "
        f"skipped={counters['skipped_duplicates']}; failed={counters['failed_count']}"
    )
    if jurisdiction:
        note += f"; jurisdiction={jurisdiction}"
    if detail:
        note += f"; detail={detail[:140]}"
    return note


def process_candidate(
    *,
    run_id: int,
    counters: dict,
    jurisdiction: str,
    item: dict,
    source_id: int,
):
    if counters["uploaded_total"] >= MAX_FILES:
        return False
    if jurisdiction == "national" and counters["national_uploaded"] >= NATIONAL_TARGET:
        return False
    if jurisdiction == "florida" and counters["florida_uploaded"] >= FLORIDA_TARGET:
        return False

    file_url = item["file_url"]
    title = item["title"] or os.path.basename(urlparse(file_url).path)
    ext = item["ext"]
    category = item["category"]
    doc_kind = item["doc_kind"]
    source_page_url = item["source_page_url"]

    try:
        if already_exists_by_url(file_url):
            counters["skipped_duplicates"] += 1
            print(
                f"[SKIP URL] {file_url} | "
                f"uploaded={counters['uploaded_total']} "
                f"skipped={counters['skipped_duplicates']} failed={counters['failed_count']}"
            )
            update_scrape_run_progress(
                run_id,
                counters["uploaded_total"],
                counters["skipped_duplicates"],
                counters["failed_count"],
                build_progress_note(counters, "duplicate-url", jurisdiction, title),
            )
            return True

        data, header_mime = fetch_file(file_url)
        file_hash = sha256_bytes(data)

        if already_exists_by_hash(file_hash):
            counters["skipped_duplicates"] += 1
            print(
                f"[SKIP HASH] {file_url} | "
                f"uploaded={counters['uploaded_total']} "
                f"skipped={counters['skipped_duplicates']} failed={counters['failed_count']}"
            )
            update_scrape_run_progress(
                run_id,
                counters["uploaded_total"],
                counters["skipped_duplicates"],
                counters["failed_count"],
                build_progress_note(counters, "duplicate-hash", jurisdiction, title),
            )
            return True

        extraction = extract_text_and_meta(data, ext)
        if ext == ".pdf":
            print(
                f"[PDF TRANSCRIBED] status={extraction['status']} "
                f"pages={extraction['page_count']} title={title}"
            )
        mime_type = guess_mime_type(ext, header_mime)
        file_name = safe_filename_from_title(title, ext)
        storage_path = f"{jurisdiction}/{doc_kind}s/{category}/{file_name}"

        upload_to_storage(storage_path, data, mime_type)

        metadata = {
            "source_id": source_id,
            "title": title[:1000],
            "form_number": None,
            "jurisdiction_level": jurisdiction,
            "state_code": "FL" if jurisdiction == "florida" else None,
            "category": category,
            "subcategory": None,
            "doc_kind": doc_kind,
            "language": "en",
            "source_page_url": source_page_url,
            "original_file_url": file_url,
            "storage_bucket": SUPABASE_BUCKET,
            "storage_path": storage_path,
            "file_name": file_name,
            "file_ext": ext,
            "mime_type": mime_type,
            "file_size_bytes": len(data),
            "sha256_hash": file_hash,
            "is_fillable_pdf": extraction["is_fillable_pdf"],
            "page_count": extraction["page_count"],
            "extraction_status": extraction["status"],
            "scrape_status": "indexed",
            "published_date": None,
            "revision_label": None,
        }

        insert_document(
            metadata=metadata,
            extracted_text=extraction["text"],
            extraction_method=extraction["method"],
        )

        counters["uploaded_total"] += 1
        if jurisdiction == "national":
            counters["national_uploaded"] += 1
        else:
            counters["florida_uploaded"] += 1

        print(
            f"[OK] {counters['uploaded_total']}/{MAX_FILES} | {jurisdiction} | {title} | "
            f"national={counters['national_uploaded']}/{NATIONAL_TARGET} "
            f"florida={counters['florida_uploaded']}/{FLORIDA_TARGET} "
            f"skipped={counters['skipped_duplicates']} failed={counters['failed_count']}"
        )

        update_scrape_run_progress(
            run_id,
            counters["uploaded_total"],
            counters["skipped_duplicates"],
            counters["failed_count"],
            build_progress_note(counters, "uploaded", jurisdiction, title),
        )
        time.sleep(0.2)
        return True

    except Exception as e:
        counters["failed_count"] += 1
        print(
            f"[FAIL] {file_url} -> {e} | "
            f"uploaded={counters['uploaded_total']} "
            f"skipped={counters['skipped_duplicates']} failed={counters['failed_count']}"
        )
        update_scrape_run_progress(
            run_id,
            counters["uploaded_total"],
            counters["skipped_duplicates"],
            counters["failed_count"],
            build_progress_note(counters, "failed", jurisdiction, title),
        )
        return True


def crawl_and_process_sources(
    *,
    start_pages,
    jurisdiction: str,
    target_count: int,
    run_id: int,
    counters: dict,
    source_id: int,
):
    queue = list(start_pages)
    visited = set()
    seen_urls = set()
    seen_document_keys = set()

    print(
        f"[DISCOVERY START] jurisdiction={jurisdiction} "
        f"start_pages={len(start_pages)} target={target_count}"
    )
    update_scrape_run_progress(
        run_id,
        counters["uploaded_total"],
        counters["skipped_duplicates"],
        counters["failed_count"],
        build_progress_note(counters, "discovering", jurisdiction),
    )

    while queue:
        if counters["uploaded_total"] >= MAX_FILES:
            print(f"[STOP] Reached MAX_FILES={MAX_FILES}")
            break
        if jurisdiction == "national" and counters["national_uploaded"] >= NATIONAL_TARGET:
            break
        if jurisdiction == "florida" and counters["florida_uploaded"] >= FLORIDA_TARGET:
            break

        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        print(
            f"[DISCOVERY PAGE] jurisdiction={jurisdiction} "
            f"visited={len(visited)} queued={len(queue)} url={url}"
        )

        files, more_pages = discover_links_from_page(url, jurisdiction)
        files.sort(key=sort_candidate_key)

        print(
            f"[DISCOVERY RESULT] jurisdiction={jurisdiction} "
            f"found_files={len(files)} found_pages={len(more_pages)} "
            f"processed={counters['uploaded_total']}"
        )

        for item in files:
            if item["file_url"] in seen_urls:
                continue
            doc_key = document_identity_key(item["file_url"])
            if doc_key in seen_document_keys:
                continue
            seen_urls.add(item["file_url"])
            seen_document_keys.add(doc_key)
            process_candidate(
                run_id=run_id,
                counters=counters,
                jurisdiction=jurisdiction,
                item=item,
                source_id=source_id,
            )
            if counters["uploaded_total"] >= MAX_FILES:
                break
            if jurisdiction == "national" and counters["national_uploaded"] >= NATIONAL_TARGET:
                break
            if jurisdiction == "florida" and counters["florida_uploaded"] >= FLORIDA_TARGET:
                break

        for p in more_pages:
            if p not in visited and p not in queue:
                queue.append(p)

        update_scrape_run_progress(
            run_id,
            counters["uploaded_total"],
            counters["skipped_duplicates"],
            counters["failed_count"],
            build_progress_note(
                counters,
                "discovering",
                jurisdiction,
                f"visited={len(visited)} queued={len(queue)}",
            ),
        )
        time.sleep(0.2)

    print(
        f"[DISCOVERY DONE] jurisdiction={jurisdiction} "
        f"visited={len(visited)} uploaded={counters['uploaded_total']}"
    )


def main():
    started_at = time.time()
    us_source_id = get_source_id("U.S. Courts Forms")
    fl_source_id = get_source_id("Florida Courts Forms")

    run_id = create_scrape_run()
    print(
        f"[RUN START] run_id={run_id} max_files={MAX_FILES} "
        f"national_target={NATIONAL_TARGET} florida_target={FLORIDA_TARGET}"
    )

    counters = {
        "national_uploaded": 0,
        "florida_uploaded": 0,
        "uploaded_total": 0,
        "skipped_duplicates": 0,
        "failed_count": 0,
    }

    print("[INFO] Discovering and processing national files...")
    crawl_and_process_sources(
        start_pages=US_COURTS_START_PAGES,
        jurisdiction="national",
        target_count=NATIONAL_TARGET,
        run_id=run_id,
        counters=counters,
        source_id=us_source_id,
    )

    print("[INFO] Discovering and processing Florida files...")
    crawl_and_process_sources(
        start_pages=FLORIDA_START_PAGES,
        jurisdiction="florida",
        target_count=FLORIDA_TARGET,
        run_id=run_id,
        counters=counters,
        source_id=fl_source_id,
    )

    finish_scrape_run(
        run_id=run_id,
        uploaded=counters["uploaded_total"],
        skipped=counters["skipped_duplicates"],
        failed=counters["failed_count"],
        notes=(
            f"Uploaded {counters['national_uploaded']} national and "
            f"{counters['florida_uploaded']} florida files."
        ),
    )

    elapsed_seconds = time.time() - started_at
    elapsed_minutes = elapsed_seconds / 60
    print("\nDone.")
    print(f"Uploaded total: {counters['uploaded_total']}")
    print(f"National: {counters['national_uploaded']}")
    print(f"Florida: {counters['florida_uploaded']}")
    print(f"Skipped duplicates: {counters['skipped_duplicates']}")
    print(f"Failed: {counters['failed_count']}")
    print(f"Elapsed time: {elapsed_seconds:.1f} seconds ({elapsed_minutes:.2f} minutes)")


if __name__ == "__main__":
    main()
