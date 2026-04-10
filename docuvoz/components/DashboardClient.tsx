"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import type { Document } from "@/types";

type DashboardClientProps = {
  initialDocuments: Document[];
};

function getStatusClasses(status: Document["status"]) {
  if (status === "ready") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  }

  if (status === "error") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  }

  return "bg-amber-500/15 text-amber-200 border border-amber-500/30";
}

export default function DashboardClient({
  initialDocuments,
}: DashboardClientProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Unable to delete document.");
      }

      setDocuments((current) => current.filter((document) => document.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Unable to delete document.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-1 items-start justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-5xl">
        <div className="mb-10 flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-100">
              {t("My documents", "Mis documentos")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              {t(
                "Review every upload, reopen completed translations, or remove documents you no longer need.",
                "Revisa cada carga, vuelve a abrir traducciones completas o elimina documentos que ya no necesitas."
              )}
            </p>
          </div>

          <Link
            href="/upload"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-black transition hover:bg-white"
          >
            {t("Upload another", "Subir otro")}
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-8 py-12 text-center">
            <p className="text-lg font-semibold text-zinc-200">
              {t("No documents yet.", "Todav a no hay documentos.")}
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              {t(
                "Upload your first PDF or photo to start building your reading history.",
                "Sube tu primer PDF o foto para empezar tu historial de lectura."
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => (
              <article
                key={document.id}
                className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950 px-6 py-5 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-bold text-zinc-100">
                        {document.file_name}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${getStatusClasses(
                          document.status,
                        )}`}
                      >
                        {document.status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-zinc-500">
                      {new Date(document.created_at).toLocaleString()}
                    </p>

                    <p className="mt-4 line-clamp-3 max-w-3xl text-sm leading-7 text-zinc-400">
                      {document.translated_text ??
                        document.extracted_text ??
                        document.error_message ??
                        t("Document is still processing.", "El documento sigue proces ndose.")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/document/${document.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                    >
                      {t("Open", "Abrir")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(document.id)}
                      disabled={deletingId === document.id}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-500/15 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deletingId === document.id
                        ? t("Deleting...", "Eliminando...")
                        : t("Delete", "Eliminar")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
