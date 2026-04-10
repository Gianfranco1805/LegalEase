"use client";

import { useState } from "react";
import type { DocumentLanguage, UploadDocumentResponse } from "@/types";

const LANGUAGE_OPTIONS: Array<{
  label: string;
  value: DocumentLanguage;
}> = [
  { label: "English", value: "en" },
  { label: "Spanish", value: "es" },
  { label: "Haitian Creole", value: "ht" },
  { label: "Other", value: "other" },
];

export function UploadDocumentForm() {
  const [language, setLanguage] = useState<DocumentLanguage>("en");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<UploadDocumentResponse["data"] | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus("error");
      setMessage("Choose a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("language", language);

    try {
      setStatus("uploading");
      setMessage("");
      setResult(null);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | UploadDocumentResponse
        | { error?: string };

      if (!response.ok || !("data" in payload)) {
        throw new Error(
          ("error" in payload && payload.error) || "Upload failed.",
        );
      }

      setStatus("success");
      setResult(payload.data);
      setMessage("Document uploaded successfully.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Upload failed unexpectedly.",
      );
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
          Private Uploads
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Upload a document into your private buckets
        </h2>
        <p className="text-base leading-7 text-slate-600">
          Files are uploaded to <code>privateLegalDocs</code>. A matching JSON
          metadata record is written to <code>privateDocData</code>, including
          the selected language and any extracted text we can pull from the
          file.
        </p>
      </div>

      <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">
            Document language
          </span>
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as DocumentLanguage)
            }
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Document file</span>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.json"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            className="block w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
          <p className="text-sm text-slate-500">
            Supported right now: PDF, DOCX, TXT, MD, JSON.
          </p>
        </label>

        <button
          type="submit"
          disabled={status === "uploading"}
          className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-500 px-6 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-200"
        >
          {status === "uploading" ? "Uploading..." : "Upload document"}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        <p>Status: {status}</p>
        {message ? <p className="mt-1">{message}</p> : null}
        {result ? (
          <div className="mt-3 space-y-1 text-slate-600">
            <p>Document ID: {result.id}</p>
            <p>Language: {result.language}</p>
            <p>
              File bucket/path: {result.storageBucket}/{result.storagePath}
            </p>
            <p>
              Metadata bucket/path: {result.metadataBucket}/{result.metadataPath}
            </p>
            <p>Extraction status: {result.extractionStatus}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
