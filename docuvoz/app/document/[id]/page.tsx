import { notFound } from "next/navigation";
import DocumentPageClient from "@/components/DocumentPageClient";
import { DOCUMENTS_BUCKET, getDocumentForUser } from "@/lib/documents";
import { createServerClient } from "@/lib/supabase";
import type { DocumentViewerData, TranslationStatus } from "@/types";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

type PrivateDocumentRow = {
  id: number;
  user_id: string;
  title: string;
  file_name: string;
  mime_type: string | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
};

type PrivateDocumentTextRow = {
  extracted_text: string | null;
};

type PrivateTranslationRow = {
  translation_status: TranslationStatus;
  translated_text: string | null;
  summary_es: string | null;
  summary_points_json: string[] | null;
  translated_pdf_bucket: string;
  translated_pdf_path: string | null;
  last_error: string | null;
};

async function createSignedUrl(
  client: Awaited<ReturnType<typeof createServerClient>>["client"],
  bucket: string,
  path: string | null,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

async function getPrivateDocumentViewer(
  client: Awaited<ReturnType<typeof createServerClient>>["client"],
  userId: string,
  id: string,
): Promise<DocumentViewerData | null> {
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isFinite(parsedId)) {
    return null;
  }

  const { data: document, error: documentError } = await client
    .from("private_documents")
    .select(
      "id,user_id,title,file_name,mime_type,storage_bucket,storage_path,created_at",
    )
    .eq("id", parsedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (documentError) {
    throw documentError;
  }

  if (!document) {
    return null;
  }

  const { data: textRow, error: textError } = await client
    .from("private_document_text")
    .select("extracted_text")
    .eq("document_id", parsedId)
    .maybeSingle();

  if (textError) {
    throw textError;
  }

  const { data: translation, error: translationError } = await client
    .from("private_document_translations")
    .select(
      "translation_status,translated_text,summary_es,summary_points_json,translated_pdf_bucket,translated_pdf_path,last_error",
    )
    .eq("document_id", parsedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (translationError) {
    throw translationError;
  }

  const typedDocument = document as PrivateDocumentRow;
  const typedTextRow = textRow as PrivateDocumentTextRow | null;
  const typedTranslation = translation as PrivateTranslationRow | null;

  const originalPdfUrl =
    typedDocument.mime_type === "application/pdf"
      ? await createSignedUrl(
          client,
          typedDocument.storage_bucket,
          typedDocument.storage_path,
        )
      : null;

  const translatedPdfUrl =
    typedTranslation?.translated_pdf_path
      ? await createSignedUrl(
          client,
          typedTranslation.translated_pdf_bucket,
          typedTranslation.translated_pdf_path,
        )
      : null;

  return {
    id: String(typedDocument.id),
    title: typedDocument.title,
    fileName: typedDocument.file_name,
    createdAt: typedDocument.created_at,
    mimeType: typedDocument.mime_type,
    originalText: typedTextRow?.extracted_text ?? null,
    translatedText: typedTranslation?.translated_text ?? null,
    summaryEs: typedTranslation?.summary_es ?? null,
    summaryPoints: typedTranslation?.summary_points_json ?? [],
    translationStatus: typedTranslation?.translation_status ?? "unavailable",
    errorMessage: typedTranslation?.last_error ?? null,
    originalPdfUrl,
    translatedPdfUrl,
    canTranslate: true,
    source: "private",
  };
}

async function getLegacyDocumentViewer(
  client: Awaited<ReturnType<typeof createServerClient>>["client"],
  userId: string,
  id: string,
): Promise<DocumentViewerData | null> {
  const document = await getDocumentForUser(client, userId, id);

  if (!document) {
    return null;
  }

  const originalPdfUrl =
    document.mime_type === "application/pdf" && document.storage_path
      ? await createSignedUrl(client, DOCUMENTS_BUCKET, document.storage_path)
      : null;

  return {
    id: document.id,
    title: document.file_name,
    fileName: document.file_name,
    createdAt: document.created_at,
    mimeType: document.mime_type,
    originalText: document.extracted_text,
    translatedText: document.translated_text,
    summaryEs: null,
    summaryPoints: [],
    translationStatus:
      document.status === "ready"
        ? "ready"
        : document.status === "error"
          ? "failed"
          : "processing",
    errorMessage: document.error_message,
    originalPdfUrl,
    translatedPdfUrl: null,
    canTranslate: false,
    source: "legacy",
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const { client, userId } = await createServerClient();
  const document =
    (await getPrivateDocumentViewer(client, userId, id)) ??
    (await getLegacyDocumentViewer(client, userId, id));

  if (!document) {
    notFound();
  }

  return <DocumentPageClient document={document} />;
}
