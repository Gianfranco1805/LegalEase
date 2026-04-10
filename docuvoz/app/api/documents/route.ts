import { createServerClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { client, userId } = await createServerClient();
    const { data: documents, error } = await client
      .from("private_documents")
      .select(
        "id,title,language,file_name,mime_type,extraction_status,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const documentIds = (documents ?? []).map((document) => document.id);
    const { data: translations, error: translationError } = documentIds.length
      ? await client
          .from("private_document_translations")
          .select(
            "document_id,translation_status,summary_status,translated_pdf_path,translated_text_path,summary_es",
          )
          .in("document_id", documentIds)
      : { data: [], error: null };

    if (translationError) {
      return Response.json({ error: translationError.message }, { status: 500 });
    }

    const translationMap = new Map(
      (translations ?? []).map((translation) => [
        translation.document_id,
        translation,
      ]),
    );

    return Response.json({
      data: (documents ?? []).map((document) => ({
        ...document,
        ...translationMap.get(document.id),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load documents.";

    return Response.json(
      { error: message },
      {
        status: message.toLowerCase().includes("unauthenticated") ? 401 : 500,
      },
    );
  }
}
