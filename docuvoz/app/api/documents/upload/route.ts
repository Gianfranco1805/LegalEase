import { createHash } from "crypto";
import path from "path";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { createServerClient } from "@/lib/supabase";

const PRIVATE_LEGAL_DOCS_BUCKET =
  process.env.PRIVATE_LEGAL_DOCS_BUCKET || "privateLegalDocs";
const PRIVATE_DOC_DATA_BUCKET =
  process.env.PRIVATE_DOC_DATA_BUCKET || "privateDocData";

const SUPPORTED_UPLOAD_TYPES = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".json",
]);

type ExtractionResult = {
  text: string;
  extractionMethod: "pdf" | "docx" | "none";
  extractionStatus: "success" | "partial" | "failed" | "not_attempted";
  pageCount: number | null;
};

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
}

function metadataPathFromStoragePath(storagePath: string) {
  const parsed = path.posix.parse(storagePath);
  return path.posix.join(parsed.dir, `${parsed.name}.json`);
}

function inferMimeType(file: File, fileExt: string) {
  if (file.type) {
    return file.type;
  }

  switch (fileExt) {
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".txt":
      return "text/plain";
    case ".md":
      return "text/markdown";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

async function extractDocumentText(
  fileBuffer: Buffer,
  fileExt: string,
): Promise<ExtractionResult> {
  if (fileExt === ".pdf") {
    try {
      const result = await pdf(fileBuffer);
      const text = result.text.trim();

      return {
        text,
        extractionMethod: "pdf",
        extractionStatus: text ? "success" : "partial",
        pageCount: result.numpages ?? null,
      };
    } catch {
      return {
        text: "",
        extractionMethod: "none",
        extractionStatus: "failed",
        pageCount: null,
      };
    }
  }

  if (fileExt === ".docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value.trim();

      return {
        text,
        extractionMethod: "docx",
        extractionStatus: text ? "success" : "partial",
        pageCount: null,
      };
    } catch {
      return {
        text: "",
        extractionMethod: "none",
        extractionStatus: "failed",
        pageCount: null,
      };
    }
  }

  if (fileExt === ".txt" || fileExt === ".md" || fileExt === ".json") {
    const text = fileBuffer.toString("utf-8").trim();

    return {
      text,
      extractionMethod: "none",
      extractionStatus: text ? "success" : "partial",
      pageCount: null,
    };
  }

  return {
    text: "",
    extractionMethod: "none",
    extractionStatus: "not_attempted",
    pageCount: null,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = String(formData.get("language") || "en").trim() || "en";

    if (!(file instanceof File)) {
      return Response.json({ error: "A document file is required." }, { status: 400 });
    }

    const originalName = file.name || "document";
    const fileExt = path.extname(originalName).toLowerCase();

    if (!SUPPORTED_UPLOAD_TYPES.has(fileExt)) {
      return Response.json(
        {
          error:
            "Unsupported file type. Upload a PDF, DOCX, TXT, MD, or JSON file.",
        },
        { status: 400 },
      );
    }

    const { client, userId } = await createServerClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const sha256Hash = createHash("sha256").update(fileBuffer).digest("hex");
    const fileBaseName = path.basename(originalName, fileExt);
    const safeBaseName = sanitizeSegment(fileBaseName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `${sanitizeSegment(userId)}/${timestamp}-${safeBaseName}${fileExt}`;
    const metadataPath = metadataPathFromStoragePath(storagePath);
    const mimeType = inferMimeType(file, fileExt);

    const extraction = await extractDocumentText(fileBuffer, fileExt);

    const sourcePageUrl = `private://upload/${userId}`;
    const originalFileUrl = `private://${PRIVATE_LEGAL_DOCS_BUCKET}/${storagePath}`;

    const fileUpload = await client.storage
      .from(PRIVATE_LEGAL_DOCS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (fileUpload.error) {
      return Response.json(
        { error: `File upload failed: ${fileUpload.error.message}` },
        { status: 500 },
      );
    }

    const insertedDocument = await client
      .from("legal_documents")
      .insert({
        source_id: null,
        title: fileBaseName,
        form_number: null,
        jurisdiction_level: "national",
        state_code: null,
        category: "private_upload",
        subcategory: "user_upload",
        doc_kind: "unknown",
        language,
        source_page_url: sourcePageUrl,
        original_file_url: originalFileUrl,
        storage_bucket: PRIVATE_LEGAL_DOCS_BUCKET,
        storage_path: storagePath,
        file_name: originalName,
        file_ext: fileExt,
        mime_type: mimeType,
        file_size_bytes: file.size,
        sha256_hash: sha256Hash,
        is_fillable_pdf: false,
        page_count: extraction.pageCount,
        extraction_status: extraction.extractionStatus,
        scrape_status: "uploaded",
        published_date: null,
        revision_label: null,
      })
      .select("id,title,language,storage_bucket,storage_path,created_at")
      .single();

    if (insertedDocument.error || !insertedDocument.data) {
      return Response.json(
        {
          error: `Database insert failed: ${
            insertedDocument.error?.message || "unknown error"
          }`,
        },
        { status: 500 },
      );
    }

    const insertedText = await client.from("document_text").upsert({
      document_id: insertedDocument.data.id,
      extracted_text: extraction.text,
      extraction_method: extraction.extractionMethod,
    });

    if (insertedText.error) {
      return Response.json(
        { error: `Text insert failed: ${insertedText.error.message}` },
        { status: 500 },
      );
    }

    const metadataPayload = {
      document_id: insertedDocument.data.id,
      user_id: userId,
      title: fileBaseName,
      original_file_name: originalName,
      language,
      file_ext: fileExt,
      mime_type: mimeType,
      file_size_bytes: file.size,
      sha256_hash: sha256Hash,
      storage_bucket: PRIVATE_LEGAL_DOCS_BUCKET,
      storage_path: storagePath,
      metadata_bucket: PRIVATE_DOC_DATA_BUCKET,
      metadata_path: metadataPath,
      extraction_status: extraction.extractionStatus,
      extraction_method: extraction.extractionMethod,
      extracted_text: extraction.text,
      page_count: extraction.pageCount,
      created_at: insertedDocument.data.created_at,
      visibility: "private",
      category: "private_upload",
    };

    const metadataUpload = await client.storage
      .from(PRIVATE_DOC_DATA_BUCKET)
      .upload(metadataPath, JSON.stringify(metadataPayload, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (metadataUpload.error) {
      return Response.json(
        { error: `Metadata upload failed: ${metadataUpload.error.message}` },
        { status: 500 },
      );
    }

    return Response.json({
      data: {
        id: insertedDocument.data.id,
        title: insertedDocument.data.title,
        language: insertedDocument.data.language,
        storageBucket: PRIVATE_LEGAL_DOCS_BUCKET,
        storagePath,
        metadataBucket: PRIVATE_DOC_DATA_BUCKET,
        metadataPath,
        extractionStatus: extraction.extractionStatus,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected upload failure.";

    return Response.json({ error: message }, { status: 500 });
  }
}
