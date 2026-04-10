import { apiError } from "@/lib/supabase";
import { translatePrivateDocumentToSpanish } from "@/lib/document-translation";

function parseId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const documentId = parseId(params.id);

    if (!documentId) {
      return apiError("Invalid document id.", 400);
    }

    const translation = await translatePrivateDocumentToSpanish(documentId);

    return Response.json({
      data: {
        documentId: translation.document_id,
        translationStatus: translation.translation_status,
        summaryStatus: translation.summary_status,
        translatedPdfBucket: translation.translated_pdf_bucket,
        translatedPdfPath: translation.translated_pdf_path,
        translatedTextBucket: translation.translated_text_bucket,
        translatedTextPath: translation.translated_text_path,
        summary: translation.summary_es,
        summaryBullets: translation.summary_points_json,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed unexpectedly.";

    if (message.toLowerCase().includes("document not found")) {
      return apiError(message, 404);
    }

    if (message.toLowerCase().includes("unauthenticated")) {
      return apiError(message, 401);
    }

    return apiError(message, 500);
  }
}
