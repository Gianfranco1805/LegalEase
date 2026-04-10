import path from "node:path";

import { apiError } from "@/lib/supabase";
import { extractDocumentText } from "@/lib/document-extraction";
import { translatePrivateDocumentToSpanish } from "@/lib/document-translation";
import { createPrivateDocument } from "@/lib/private-documents";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const titleValue = formData.get("title");
    const languageValue = formData.get("language");
    const translateToSpanishValue = formData.get("translate_to_spanish");

    if (!(file instanceof File)) {
      return apiError("A file upload is required.", 400);
    }

    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return apiError("Unsupported file type.", 400);
    }

    const language =
      typeof languageValue === "string" && languageValue.trim()
        ? languageValue.trim().toLowerCase()
        : "en";

    const rawTitle =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : path.parse(file.name).name || "Untitled document";

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = path.extname(file.name).toLowerCase();
    const extraction = await extractDocumentText(
      fileBuffer,
      fileExtension,
      mimeType,
    );

    const result = await createPrivateDocument({
      title: rawTitle,
      language,
      fileName: file.name,
      fileExtension,
      mimeType,
      fileSizeBytes: file.size,
      fileBuffer,
      extractedText: extraction.extractedText,
      extractionMethod: extraction.extractionMethod,
      extractionStatus: extraction.extractionStatus,
      pageCount: extraction.pageCount,
      isFillablePdf: extraction.isFillablePdf,
    });

    const shouldTranslate =
      typeof translateToSpanishValue === "string" &&
      translateToSpanishValue.toLowerCase() === "true";

    const translation = shouldTranslate
      ? await translatePrivateDocumentToSpanish(result.document.id)
      : null;

    return Response.json({
      data: {
        id: result.document.id,
        title: result.document.title,
        language: result.document.language,
        extraction_status: result.document.extraction_status,
        extractionStatus: result.document.extraction_status,
        storage_path: result.document.storage_path,
        storagePath: result.document.storage_path,
        metadata_path: result.document.metadata_path,
        metadataPath: result.document.metadata_path,
        storageBucket: result.document.storage_bucket,
        metadataBucket: result.document.metadata_bucket,
        translationStatus:
          translation?.translation_status || (shouldTranslate ? "processing" : undefined),
        summaryStatus:
          translation?.summary_status || (shouldTranslate ? "processing" : undefined),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed unexpectedly.";

    if (message.toLowerCase().includes("unauthenticated")) {
      return apiError(message, 401);
    }

    return apiError(message, 500);
  }
}
