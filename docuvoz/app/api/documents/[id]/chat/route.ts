import { apiError, apiSuccess, createServerClient } from "@/lib/supabase";
import { getDocumentForUser } from "@/lib/documents";
import { generateDocumentChatResponse } from "@/lib/gemini";

type ChatRequestBody = {
  message?: string;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    message: string;
  }>;
};

type PrivateDocumentChatRow = {
  id: number;
  title: string;
  file_name: string;
  private_document_text:
    | { extracted_text: string | null }
    | Array<{ extracted_text: string | null }>
    | null;
  private_document_translations:
    | {
        translated_text: string | null;
        summary_es: string | null;
        summary_points_json: string[] | null;
      }
    | Array<{
        translated_text: string | null;
        summary_es: string | null;
        summary_points_json: string[] | null;
      }>
    | null;
};

function parsePrivateId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return apiError("A chat message is required.", 400);
    }

    const { client, userId } = await createServerClient();
    const { id } = await context.params;
    const privateId = parsePrivateId(id);

    if (privateId) {
      const { data: document, error: documentError } = await client
        .from("private_documents")
        .select(
          "id,title,file_name,private_document_text(extracted_text),private_document_translations(translated_text,summary_es,summary_points_json)",
        )
        .eq("id", privateId)
        .eq("user_id", userId)
        .maybeSingle();

      if (documentError) {
        return apiError(documentError.message, 500);
      }

      if (!document) {
        return apiError("Document not found.", 404);
      }

      const typedDocument = document as PrivateDocumentChatRow;
      const documentText = Array.isArray(typedDocument.private_document_text)
        ? typedDocument.private_document_text[0]?.extracted_text
        : typedDocument.private_document_text?.extracted_text;
      const translation = Array.isArray(typedDocument.private_document_translations)
        ? typedDocument.private_document_translations[0]
        : typedDocument.private_document_translations;

      if (!documentText?.trim()) {
        return apiError("This document does not have readable text to chat about yet.", 400);
      }

      const result = await generateDocumentChatResponse({
        documentText,
        translatedText: translation?.translated_text ?? null,
        summary: translation?.summary_es ?? null,
        summaryBullets: translation?.summary_points_json ?? [],
        conversationHistory: body.conversationHistory ?? [],
        message,
      });

      return apiSuccess(result);
    }

    if (!isUuid(id)) {
      return apiError("Document not found.", 404);
    }

    const legacyDocument = await getDocumentForUser(client, userId, id);

    if (!legacyDocument) {
      return apiError("Document not found.", 404);
    }

    if (!legacyDocument.extracted_text?.trim()) {
      return apiError("This document does not have readable text to chat about yet.", 400);
    }

    const result = await generateDocumentChatResponse({
      documentText: legacyDocument.extracted_text,
      translatedText: legacyDocument.translated_text,
      conversationHistory: body.conversationHistory ?? [],
      message,
    });

    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "We could not send your question right now.";

    if (message.toLowerCase().includes("unauthenticated")) {
      return apiError(message, 401);
    }

    return apiError(message, 500);
  }
}
