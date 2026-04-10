import path from "node:path";

import { createServerClient } from "@/lib/supabase";
import { generateSpanishTranslationAndSummary } from "@/lib/gemini";
import { renderSpanishPdf } from "@/lib/pdf-render";

const SPANISH_PDF_BUCKET =
  process.env.SUPABASE_SPANISH_DOCS_BUCKET || "spanishLegalDocs";
const SPANISH_TEXT_BUCKET =
  process.env.SUPABASE_SPANISH_TEXT_BUCKET || "spanishLegalDocsTranslated";
const PRIVATE_DOC_DATA_BUCKET =
  process.env.SUPABASE_PRIVATE_DOC_DATA_BUCKET || "privateDocData";

type TranslationRecord = {
  id: number;
  document_id: number;
  user_id: string;
  target_language: string;
  translation_status: string;
  summary_status: string;
  translated_text_bucket: string;
  translated_text_path: string | null;
  translated_pdf_bucket: string;
  translated_pdf_path: string | null;
  metadata_bucket: string;
  metadata_path: string | null;
  translation_model: string | null;
  summary_model: string | null;
  translated_text: string | null;
  summary_es: string | null;
  summary_points_json: string[] | null;
  translated_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

function buildMetadataPayload(params: {
  documentId: number;
  title: string;
  userId: string;
  translation: TranslationRecord;
  originalStoragePath: string;
  originalBucket: string;
}) {
  return {
    document_id: params.documentId,
    user_id: params.userId,
    title: params.title,
    target_language: "es",
    original_bucket: params.originalBucket,
    original_storage_path: params.originalStoragePath,
    translated_text_bucket: params.translation.translated_text_bucket,
    translated_text_path: params.translation.translated_text_path,
    translated_pdf_bucket: params.translation.translated_pdf_bucket,
    translated_pdf_path: params.translation.translated_pdf_path,
    metadata_bucket: params.translation.metadata_bucket,
    metadata_path: params.translation.metadata_path,
    translation_status: params.translation.translation_status,
    summary_status: params.translation.summary_status,
    translation_model: params.translation.translation_model,
    summary_model: params.translation.summary_model,
    summary_es: params.translation.summary_es,
    summary_points_json: params.translation.summary_points_json,
    translated_at: params.translation.translated_at,
  };
}

export async function translatePrivateDocumentToSpanish(documentId: number) {
  const { client, userId } = await createServerClient();

  const { data: document, error: documentError } = await client
    .from("private_documents")
    .select(
      "id,user_id,title,language,storage_bucket,storage_path,file_name,mime_type",
    )
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (documentError || !document) {
    throw new Error("Document not found.");
  }

  const { data: textRow, error: textError } = await client
    .from("private_document_text")
    .select("extracted_text,extraction_method")
    .eq("document_id", documentId)
    .maybeSingle();

  if (textError) {
    throw new Error(textError.message);
  }

  const { data: existingTranslation } = await client
    .from("private_document_translations")
    .select("*")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  const baseName = slugify(path.parse(document.file_name).name || document.title);
  const translatedTextPath = `${userId}/${documentId}/translation/${baseName}-es.txt`;
  const translatedPdfPath = `${userId}/${documentId}/translation/${baseName}-es.pdf`;
  const metadataPath = `${userId}/${documentId}/translation/metadata.json`;

  let translationRow: TranslationRecord | null = existingTranslation as TranslationRecord | null;

  if (!translationRow) {
    const { data: createdTranslation, error: createError } = await client
      .from("private_document_translations")
      .insert({
        document_id: documentId,
        user_id: userId,
        target_language: "es",
        translation_status: "processing",
        summary_status: "processing",
        translated_text_bucket: SPANISH_TEXT_BUCKET,
        translated_text_path: translatedTextPath,
        translated_pdf_bucket: SPANISH_PDF_BUCKET,
        translated_pdf_path: translatedPdfPath,
        metadata_bucket: PRIVATE_DOC_DATA_BUCKET,
        metadata_path: metadataPath,
      })
      .select("*")
      .single();

    if (createError || !createdTranslation) {
      throw new Error(createError?.message || "Failed to create translation row.");
    }

    translationRow = createdTranslation as TranslationRecord;
  } else {
    const { data: updatedTranslation, error: updateError } = await client
      .from("private_document_translations")
      .update({
        translation_status: "processing",
        summary_status: "processing",
        last_error: null,
        translated_text_bucket: SPANISH_TEXT_BUCKET,
        translated_text_path: translatedTextPath,
        translated_pdf_bucket: SPANISH_PDF_BUCKET,
        translated_pdf_path: translatedPdfPath,
        metadata_bucket: PRIVATE_DOC_DATA_BUCKET,
        metadata_path: metadataPath,
      })
      .eq("id", translationRow.id)
      .select("*")
      .single();

    if (updateError || !updatedTranslation) {
      throw new Error(updateError?.message || "Failed to update translation row.");
    }

    translationRow = updatedTranslation as TranslationRecord;
  }

  try {
    const extractedText = textRow?.extracted_text?.trim() || "";
    let sourceFile:
      | {
          buffer: Buffer;
          mimeType: string;
          fileName: string;
        }
      | undefined;

    if (!extractedText) {
      const { data: blob, error: downloadError } = await client.storage
        .from(document.storage_bucket)
        .download(document.storage_path);

      if (downloadError || !blob) {
        throw new Error(downloadError?.message || "Failed to load original file.");
      }

      sourceFile = {
        buffer: Buffer.from(await blob.arrayBuffer()),
        mimeType: document.mime_type || "application/octet-stream",
        fileName: document.file_name,
      };
    }

    const generated = await generateSpanishTranslationAndSummary({
      sourceText: extractedText || undefined,
      sourceFile,
    });

    const translatedPdfBuffer = await renderSpanishPdf({
      title: `${document.title} (Spanish Translation)`,
      translatedText: generated.translatedText,
      summary: generated.summary,
      summaryBullets: generated.summaryBullets,
    });

    const { error: textUploadError } = await client.storage
      .from(SPANISH_TEXT_BUCKET)
      .upload(translatedTextPath, generated.translatedText, {
        contentType: "text/plain; charset=utf-8",
        upsert: true,
      });

    if (textUploadError) {
      throw new Error(textUploadError.message);
    }

    const { error: pdfUploadError } = await client.storage
      .from(SPANISH_PDF_BUCKET)
      .upload(translatedPdfPath, translatedPdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (pdfUploadError) {
      throw new Error(pdfUploadError.message);
    }

    const { data: finalizedRow, error: finalError } = await client
      .from("private_document_translations")
      .update({
        translation_status: "completed",
        summary_status: "completed",
        translated_text: generated.translatedText,
        summary_es: generated.summary,
        summary_points_json: generated.summaryBullets,
        translation_model: generated.model,
        summary_model: generated.model,
        translated_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", translationRow.id)
      .select("*")
      .single();

    if (finalError || !finalizedRow) {
      throw new Error(finalError?.message || "Failed to finalize translation.");
    }

    const translation = finalizedRow as TranslationRecord;
    const metadataPayload = buildMetadataPayload({
      documentId,
      title: document.title,
      userId,
      translation,
      originalStoragePath: document.storage_path,
      originalBucket: document.storage_bucket,
    });

    const { error: metadataUploadError } = await client.storage
      .from(PRIVATE_DOC_DATA_BUCKET)
      .upload(metadataPath, JSON.stringify(metadataPayload, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (metadataUploadError) {
      throw new Error(metadataUploadError.message);
    }

    return translation;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed unexpectedly.";

    await client
      .from("private_document_translations")
      .update({
        translation_status: "failed",
        summary_status: "failed",
        last_error: message,
      })
      .eq("id", translationRow.id);

    throw new Error(message);
  }
}
