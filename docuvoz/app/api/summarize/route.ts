import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { extracted_text } = await req.json();

    if (!extracted_text) {
      return NextResponse.json(
        { error: "extracted_text is required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({});

    const promptText = `You are a helpful bilingual assistant. Read the following English document and 
identify the 3-5 most important points a person must understand. Return them 
in simple, clear Spanish as a short numbered list. Focus on: deadlines, amounts 
owed, actions required, and key terms.

Document:
${extracted_text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
    });

    return NextResponse.json({ summary_text: response.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
