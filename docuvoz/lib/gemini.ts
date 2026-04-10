import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import {
  createPartFromText,
  createPartFromUri,
  FileState,
  GoogleGenAI,
  Type,
} from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_TRANSLATION_MODEL || "gemini-2.5-flash";

type TranslationSummaryResult = {
  translatedText: string;
  summary: string;
  summaryBullets: string[];
};

type GenerateParams = {
  sourceText?: string;
  sourceFile?: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
};

let geminiClient: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

async function waitForActiveFile(fileName: string) {
  const client = getClient();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const file = await client.files.get({ name: fileName });

    if (file.state === FileState.ACTIVE) {
      return file;
    }

    if (file.state === FileState.FAILED) {
      throw new Error(file.error?.message || "Gemini file processing failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("Timed out waiting for Gemini file processing.");
}

async function uploadTempFile(params: GenerateParams["sourceFile"]) {
  if (!params) {
    return null;
  }

  const client = getClient();
  const tempPath = path.join(
    os.tmpdir(),
    `legalease-${Date.now()}-${params.fileName}`,
  );

  await fs.writeFile(tempPath, params.buffer);

  try {
    const uploadedFile = await client.files.upload({
      file: tempPath,
      config: {
        mimeType: params.mimeType,
      },
    });

    if (!uploadedFile.name || !uploadedFile.uri || !uploadedFile.mimeType) {
      throw new Error("Gemini file upload did not return usable file metadata.");
    }

    return await waitForActiveFile(uploadedFile.name);
  } finally {
    await fs.unlink(tempPath).catch(() => undefined);
  }
}

function parseStructuredResponse(rawText: string): TranslationSummaryResult {
  const parsed = JSON.parse(rawText) as {
    translatedText?: string;
    summary?: string;
    summaryBullets?: string[];
  };

  return {
    translatedText: parsed.translatedText?.trim() || "",
    summary: parsed.summary?.trim() || "",
    summaryBullets: (parsed.summaryBullets || [])
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export async function generateSpanishTranslationAndSummary(
  params: GenerateParams,
) {
  const client = getClient();
  const uploadedFile = await uploadTempFile(params.sourceFile);

  const prompt = [
    "You are a bilingual legal-document assistant.",
    "Translate the full document into clear, natural Spanish.",
    "Also produce a concise Spanish summary for a non-expert reader.",
    "Keep legal meaning intact, but prefer plain-language Spanish.",
    "Return JSON only with these keys: translatedText, summary, summaryBullets.",
    "summaryBullets must be an array of 3 to 6 short Spanish bullet strings.",
  ].join("\n");

  const contents = uploadedFile
    ? [
        createPartFromText(prompt),
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
      ]
    : `${prompt}\n\nDocument:\n${params.sourceText || ""}`;

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedText: {
            type: Type.STRING,
          },
          summary: {
            type: Type.STRING,
          },
          summaryBullets: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
        required: ["translatedText", "summary", "summaryBullets"],
      },
    },
  });

  const result = parseStructuredResponse(response.text || "{}");

  if (!result.translatedText) {
    throw new Error("Gemini returned an empty Spanish translation.");
  }

  return {
    ...result,
    model: GEMINI_MODEL,
  };
}
