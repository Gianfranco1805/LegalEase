"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SpeakButton from "@/components/SpeakButton";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import type { DocumentViewerData } from "@/types";

const VOICE_OPTIONS = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Clara (Femenino)" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Miguel (Masculino)" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rosa (Femenino)" },
];

type DocumentPageClientProps = {
  document: DocumentViewerData;
};

type ChatEntry = {
  role: "user" | "assistant";
  message: string;
};

export default function DocumentPageClient({
  document,
}: DocumentPageClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDeletingTranslation, setIsDeletingTranslation] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const initialChatMessages = useMemo<ChatEntry[]>(() => {
    if (document.summaryEs || document.summaryPoints.length > 0) {
      const summaryParts: string[] = [];

      if (document.summaryEs) {
        summaryParts.push(document.summaryEs);
      }

      if (document.summaryPoints.length > 0) {
        summaryParts.push(
          document.summaryPoints.map((point) => `• ${point}`).join("\n"),
        );
      }

      return [
        {
          role: "assistant",
          message: summaryParts.join("\n\n"),
        },
      ];
    }

    return [
      {
        role: "assistant",
        message: t(
          "Ask me anything about this document and I will answer using the extracted text and translation when available.",
          "Hazme cualquier pregunta sobre este documento y respondere usando el texto extraido y la traduccion cuando exista.",
        ),
      },
    ];
  }, [document.summaryEs, document.summaryPoints, t]);
  const [chatMessages, setChatMessages] = useState<ChatEntry[]>(initialChatMessages);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(VOICE_OPTIONS[0].id);

  useEffect(() => {
    const savedVoice = localStorage.getItem("docuvoz_voice_id");
    if (savedVoice) {
      setSelectedVoiceId(savedVoice);
    }
  }, []);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceId(val);
    localStorage.setItem("docuvoz_voice_id", val);
  };

  async function handleTranslate() {
    try {
      setIsTranslating(true);
      setTranslateError(null);

      const response = await fetch(`/api/documents/${document.id}/translate`, {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { data?: unknown; error?: string }
        | undefined;

      if (!response.ok) {
        throw new Error(payload?.error || "Translation failed.");
      }

      router.refresh();
    } catch (error) {
      setTranslateError(
        error instanceof Error ? error.message : "Translation failed.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleDeleteTranslation() {
    try {
      setIsDeletingTranslation(true);
      setTranslateError(null);

      const response = await fetch(`/api/documents/${document.id}/translation`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as
        | { data?: unknown; error?: string }
        | undefined;

      if (!response.ok) {
        throw new Error(payload?.error || "Translation delete failed.");
      }

      router.refresh();
    } catch (error) {
      setTranslateError(
        error instanceof Error
          ? error.message
          : "Translation delete failed.",
      );
    } finally {
      setIsDeletingTranslation(false);
    }
  }

  async function handleSendChat() {
    const message = chatInput.trim();

    if (!message) {
      return;
    }

    const previousMessages = chatMessages;
    const nextMessages: ChatEntry[] = [
      ...previousMessages,
      { role: "user", message },
    ];

    try {
      setIsSendingChat(true);
      setChatError(null);
      setChatMessages(nextMessages);
      setChatInput("");

      const response = await fetch(`/api/documents/${document.id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory: previousMessages,
        }),
      });

      const payload = (await response.json()) as
        | { data?: { text?: string }; error?: string }
        | undefined;

      if (!response.ok || !payload?.data?.text) {
        throw new Error(payload?.error || "We could not answer that question.");
      }

      setChatMessages((current) => [
        ...current,
        { role: "assistant", message: payload.data?.text || "" },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "We could not answer that question.",
      );
      setChatMessages(previousMessages);
      setChatInput(message);
    } finally {
      setIsSendingChat(false);
    }
  }

  const showProcessingState =
    document.translationStatus === "processing" ||
    document.translationStatus === "not_started";
  const showErrorState = document.translationStatus === "failed";
  const translatedAudioText = document.summaryEs || document.translatedText;

  return (
    <div className="flex flex-1 items-start justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              {t("Document viewer", "Visor de documento")}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-100">
              {document.fileName}
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              {new Date(document.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              {t("Back to dashboard", "Volver al panel")}
            </Link>

            {document.canTranslate && !document.translatedPdfUrl ? (
              <button
                type="button"
                onClick={() => void handleTranslate()}
                disabled={isTranslating}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-zinc-300"
              >
                {isTranslating
                  ? t("Translating...", "Traduciendo...")
                  : t("Create Spanish PDF", "Crear PDF en Español")}
              </button>
            ) : null}

            {translatedAudioText ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedVoiceId}
                  onChange={handleVoiceChange}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 outline-none hover:border-zinc-500"
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>

                <SpeakButton
                  text={translatedAudioText}
                  voiceId={selectedVoiceId}
                  defaultLabel={t("Read in Spanish", "Leer en Español")}
                  loadingLabel={t("Generating audio...", "Generando audio...")}
                />
              </div>
            ) : null}

            {document.canTranslate &&
              (document.translatedPdfUrl || document.translatedText) ? (
              <button
                type="button"
                onClick={() => void handleDeleteTranslation()}
                disabled={isDeletingTranslation}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500/15 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingTranslation
                  ? t("Deleting translation...", "Eliminando traduccion...")
                  : t("Delete translation", "Eliminar traduccion")}
              </button>
            ) : null}
          </div>
        </div>

        {translateError ? (
          <section className="mb-6 rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-8 py-6">
            <p className="text-sm leading-7 text-rose-100">{translateError}</p>
          </section>
        ) : null}

        {showProcessingState ? (
          <section className="rounded-[2rem] border border-amber-500/30 bg-amber-500/10 px-8 py-10">
            <h2 className="text-2xl font-bold text-amber-100">
              {t(
                "Your document is still processing",
                "Tu documento sigue procesandose",
              )}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/80">
              {t(
                "The original file is saved. We are preparing the Spanish translation and translated PDF.",
                "El archivo original ya esta guardado. Estamos preparando la traduccion al Español y el PDF traducido.",
              )}
            </p>
          </section>
        ) : null}

        {showErrorState ? (
          <section className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-8 py-10">
            <h2 className="text-2xl font-bold text-rose-100">
              {t("We hit a processing error", "Tuvimos un error al procesar")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-rose-50/80">
              {document.errorMessage ??
                t(
                  "Please try uploading the document again.",
                  "Vuelve a intentar subir el documento.",
                )}
            </p>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
            <h2 className="text-xl font-bold text-zinc-100">
              {t("Original PDF", "PDF original")}
            </h2>
            <div className="mt-4 h-[70vh] overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              {document.originalPdfUrl ? (
                <iframe
                  title="Original PDF"
                  src={document.originalPdfUrl}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-7 text-zinc-500">
                  {document.mimeType === "application/pdf"
                    ? t(
                      "We could not load the original PDF preview.",
                      "No pudimos cargar la vista previa del PDF original.",
                    )
                    : t(
                      "This document type does not have a PDF preview yet.",
                      "Este tipo de documento todavia no tiene vista previa en PDF.",
                    )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
            <h2 className="text-xl font-bold text-zinc-100">
              {t("Spanish PDF", "PDF en Español")}
            </h2>
            <div className="mt-4 h-[70vh] overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              {document.translatedPdfUrl ? (
                <iframe
                  title="Spanish PDF"
                  src={document.translatedPdfUrl}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-7 text-zinc-500">
                  {document.canTranslate
                    ? t(
                      "Your translated Spanish PDF will appear here once translation finishes.",
                      "Tu PDF traducido al Español aparecera aqui cuando termine la traduccion.",
                    )
                    : t(
                      "This older document flow does not have a generated Spanish PDF yet.",
                      "Este flujo anterior todavia no tiene un PDF en Español generado.",
                    )}
                </div>
              )}
            </div>
          </section>
        </div>

        {(document.originalText || document.translatedText) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {document.originalText ? (
              <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
                <h2 className="text-xl font-bold text-zinc-100">
                  {t("Original text", "Texto original")}
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-zinc-300">
                  {document.originalText}
                </div>
              </section>
            ) : null}

            {document.translatedText ? (
              <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
                <h2 className="text-xl font-bold text-zinc-100">
                  {t("Spanish translation text", "Texto traducido al Español")}
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-zinc-300">
                  {document.translatedText}
                </div>
              </section>
            ) : null}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
          <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-bold text-zinc-100">
              {t("Ask About This Document", "Pregunta sobre este documento")}
            </h2>
            <p className="text-sm leading-7 text-zinc-500">
              {t(
                "The summary appears here first, and you can keep chatting with Gemini below.",
                "El resumen aparece aqui primero, y luego puedes seguir chateando con Gemini abajo.",
              )}
            </p>
          </div>

          <div className="mt-5 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {chatMessages.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={`rounded-2xl px-4 py-3 text-sm leading-7 ${entry.role === "assistant"
                    ? "mr-8 border border-zinc-800 bg-black/40 text-zinc-200"
                    : "ml-8 bg-emerald-500 text-black"
                  }`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
                  {entry.role === "assistant"
                    ? t("Assistant", "Asistente")
                    : t("You", "Tu")}
                </p>
                <div className="whitespace-pre-wrap">{entry.message}</div>
              </div>
            ))}
          </div>

          {chatError ? (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-100">
              {chatError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendChat();
                }
              }}
              rows={3}
              placeholder={t(
                "Ask about deadlines, fees, obligations, or anything else in this document...",
                "Pregunta sobre fechas limite, pagos, obligaciones o cualquier otra cosa en este documento...",
              )}
              className="min-h-[5.5rem] flex-1 rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => void handleSendChat()}
              disabled={isSendingChat || !chatInput.trim()}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-zinc-400"
            >
              {isSendingChat
                ? t("Sending...", "Enviando...")
                : t("Send", "Enviar")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
