import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type TranslateRequestBody = {
  extracted_text?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { extracted_text } = (await req.json()) as TranslateRequestBody;

    if (!extracted_text) {
      return NextResponse.json(
        { error: "extracted_text is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({});

    const promptText = `You are a helpful bilingual assistant. Translate the following English document 
into clear, simple Spanish that is easy for non-native speakers and older adults 
to understand. Do not use complex legal jargon. Return only the translated text.

Document:
${extracted_text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    return NextResponse.json({ translated_text: response.text });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed." },
      { status: 500 },
    );
  }
}
