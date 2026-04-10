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
const GEMINI_MAX_RETRIES = 4;

type TranslationSummaryResult = {
  translatedText: string;
  summary: string;
  summaryBullets: string[];
};

type DocumentChatParams = {
  documentText: string;
  translatedText?: string | null;
  summary?: string | null;
  summaryBullets?: string[];
  conversationHistory?: Array<{
    role: "user" | "assistant";
    message: string;
  }>;
  message: string;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractGeminiMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Gemini error.";
  }
}

function isRetryableGeminiError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("503") ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand") ||
    normalized.includes("overloaded") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("timeout")
  );
}

function toFriendlyGeminiError(message: string) {
  if (isRetryableGeminiError(message)) {
    return "Gemini is busy right now. Please try again in a moment.";
  }

  if (message.toLowerCase().includes("api key")) {
    return "Gemini is not configured correctly. Please verify the API key.";
  }

  return "We could not generate the Spanish translation right now. Please try again.";
}

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

async function retryGeminiRequest<T>(operation: () => Promise<T>) {
  let lastMessage = "Gemini request failed.";

  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastMessage = extractGeminiMessage(error);

      if (!isRetryableGeminiError(lastMessage) || attempt === GEMINI_MAX_RETRIES - 1) {
        throw new Error(toFriendlyGeminiError(lastMessage));
      }

      const delay = 1500 * 2 ** attempt + Math.floor(Math.random() * 400);
      await sleep(delay);
    }
  }

  throw new Error(toFriendlyGeminiError(lastMessage));
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
    "Preserve the document's structure as closely as possible in plain text.",
    "Keep headings, numbered sections, bullet lists, labels, indentation, paragraph breaks, and line breaks when they are meaningful.",
    "If the source has form-like field labels or section titles, keep them visually distinct in Spanish.",
    "Do not flatten everything into one block paragraph.",
    "Return JSON only with these keys: translatedText, summary, summaryBullets.",
    "summaryBullets must be an array of 3 to 6 short Spanish bullet strings.",
  ].join("\n");

  const contents = uploadedFile
    ? [
        createPartFromText(prompt),
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
      ]
    : `${prompt}\n\nDocument:\n${params.sourceText || ""}`;

  const response = await retryGeminiRequest(() =>
    client.models.generateContent({
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
    }),
  );

  const result = parseStructuredResponse(response.text || "{}");

  if (!result.translatedText) {
    throw new Error("Gemini returned an empty Spanish translation.");
  }

  return {
    ...result,
    model: GEMINI_MODEL,
  };
}

export async function generateDocumentChatResponse(
  params: DocumentChatParams,
) {
  const client = getClient();
  const historyText =
    params.conversationHistory?.map((entry) => `${entry.role}: ${entry.message}`).join("\n") ||
    "None";
  const bulletText =
    params.summaryBullets && params.summaryBullets.length > 0
      ? params.summaryBullets.map((item) => `- ${item}`).join("\n")
      : "None";

  const prompt = [
    "You are a bilingual legal-document assistant helping a user understand a document.",
    "Answer in the same language the user uses.",
    "Use clear, plain language and keep answers grounded in the document.",
    "If the answer is not supported by the document, say that clearly.",
    "When useful, reference the translated Spanish wording and the summary below.",
    "",
    "Document text:",
    params.documentText,
    "",
    "Spanish translation text:",
    params.translatedText || "None",
    "",
    "Spanish summary:",
    params.summary || "None",
    "",
    "Spanish summary bullets:",
    bulletText,
    "",
    "Conversation so far:",
    historyText,
    "",
    `User question: ${params.message}`,
  ].join("\n");

  const response = await retryGeminiRequest(() =>
    client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    }),
  );

  const text = response.text?.trim();

  if (!text) {
    throw new Error("We could not generate a chat reply right now. Please try again.");
  }

  return {
    text,
    model: GEMINI_MODEL,
  };
}
