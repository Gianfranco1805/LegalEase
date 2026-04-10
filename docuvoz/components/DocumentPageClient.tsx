"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SpeakButton from "@/components/SpeakButton";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import type { DocumentViewerData } from "@/types";

type DocumentPageClientProps = {
  document: DocumentViewerData;
};

export default function DocumentPageClient({
  document,
}: DocumentPageClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

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
                  : t("Create Spanish PDF", "Crear PDF en espa ol")}
              </button>
            ) : null}

            {translatedAudioText ? (
              <SpeakButton
                text={translatedAudioText}
                defaultLabel={t("Read in Spanish", "Leer en espa ol")}
                loadingLabel={t("Generating audio...", "Generando audio...")}
              />
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
              {t("Your document is still processing", "Tu documento sigue proces ndose")}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/80">
              {t(
                "The original file is saved. We are preparing the Spanish translation and translated PDF.",
                "El archivo original ya esta guardado. Estamos preparando la traduccion al espanol y el PDF traducido."
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
                  "Vuelve a intentar subir el documento."
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
                        "No pudimos cargar la vista previa del PDF original."
                      )
                    : t(
                        "This document type does not have a PDF preview yet.",
                        "Este tipo de documento todavia no tiene vista previa en PDF."
                      )}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
            <h2 className="text-xl font-bold text-zinc-100">
              {t("Spanish PDF", "PDF en espa ol")}
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
                        "Tu PDF traducido al espanol aparecera aqui cuando termine la traduccion."
                      )
                    : t(
                        "This older document flow does not have a generated Spanish PDF yet.",
                        "Este flujo anterior todavia no tiene un PDF en espanol generado."
                      )}
                </div>
              )}
            </div>
          </section>
        </div>

        {document.summaryEs || document.summaryPoints.length > 0 ? (
          <section className="mt-6 rounded-[2rem] border border-zinc-800 bg-zinc-950 px-6 py-6">
            <h2 className="text-xl font-bold text-zinc-100">
              {t("Spanish summary", "Resumen en espa ol")}
            </h2>
            {document.summaryEs ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-zinc-300">
                {document.summaryEs}
              </p>
            ) : null}
            {document.summaryPoints.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-7 text-zinc-300">
                {document.summaryPoints.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

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
                  {t("Spanish translation text", "Texto traducido al espa ol")}
                </h2>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-zinc-300">
                  {document.translatedText}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
