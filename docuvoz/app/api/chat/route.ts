import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type ChatMessage = {
  role: string;
  message: string;
};

type ChatRequestBody = {
  document_text?: string;
  conversation_history?: ChatMessage[];
  message?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { document_text, conversation_history, message } =
      (await req.json()) as ChatRequestBody;

    if (!message || !document_text) {
      return NextResponse.json(
        { error: "message and document_text are required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({});

    const promptText = `You are a bilingual document assistant helping a Spanish-speaking user understand a document. You have access to the full document below. Answer the user's questions in the same language they ask in (Spanish or English). Use simple, clear language. If the answer is not in the document, say so clearly.

Document:
${document_text}

Conversation so far:
${conversation_history?.map((c) => `${c.role}: ${c.message}`).join("\n") || "None"}

User Query: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed." },
      { status: 500 },
    );
  }
}
