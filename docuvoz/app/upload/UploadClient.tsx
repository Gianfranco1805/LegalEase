"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import type { UploadDocumentResponse } from "@/types";

type UploadState = {
  isSubmitting: boolean;
  error: string | null;
  statusMessage: string | null;
};

export default function UploadClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    isSubmitting: false,
    error: null,
    statusMessage: null,
  });

  useEffect(() => {
    if (searchParams.get("mode") === "camera") {
      cameraInputRef.current?.click();
    }
  }, [searchParams]);

  async function uploadFile(file: File) {
    setUploadState({
      isSubmitting: true,
      error: null,
      statusMessage:
        file.type === "application/pdf"
          ? t("Extracting PDF text...", "Extrayendo texto del PDF...")
          : t("Uploading document...", "Subiendo documento..."),
    });

    try {
      if (file.type === "application/pdf") {
        setUploadState({
          isSubmitting: true,
          error: null,
          statusMessage: t(
            "Uploading and translating PDF...",
            "Subiendo y traduciendo PDF...",
          ),
        });
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", "en");
      formData.append("translate_to_spanish", "true");

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | UploadDocumentResponse
        | { error?: string };

      if (!response.ok || !("data" in payload)) {
        throw new Error(
          ("error" in payload && payload.error)
            ? payload.error
            : t("Upload failed.", "La carga fallo."),
        );
      }

      router.push(`/document/${payload.data.id}`);
      return;
    } catch (error) {
      console.error(error);
      setUploadState({
        isSubmitting: false,
        error:
          error instanceof Error
            ? error.message
            : t("Upload failed.", "La carga fallo."),
        statusMessage: null,
      });
    }
  }

  function handleSelectedFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const [file] = fileList;
    void uploadFile(file);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-black px-6 py-12 text-white">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 md:text-5xl">
            {t("Upload your document", "Sube tu documento")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
            {t(
              "Choose a PDF or image from your device, or take a quick photo with your phone camera.",
              "Elige un PDF o imagen desde tu dispositivo, o toma una foto rapida con la camara del telefono."
            )}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleSelectedFiles(event.dataTransfer.files);
            }}
            disabled={uploadState.isSubmitting}
            className={`rounded-[2rem] border-2 border-dashed px-8 py-12 text-left transition ${
              isDragging
                ? "border-zinc-300 bg-zinc-900 shadow-xl shadow-zinc-800/40"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900"
            }`}
          >
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
              <svg
                className="h-7 w-7 text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">
              {t("Browse or drop a file", "Busca o suelta un archivo")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {t(
                "Supports PDF, JPG, PNG, and WEBP. PDFs are parsed immediately before upload.",
                "Soporta PDF, JPG, PNG y WEBP. Los PDFs se procesan antes de subirlos."
              )}
            </p>
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadState.isSubmitting}
            className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-8 py-12 text-left transition hover:border-zinc-500 hover:bg-zinc-900"
          >
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
              <svg
                className="h-7 w-7 text-zinc-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 0 1 2-2h1.17a2 2 0 0 0 1.664-.89l.996-1.494A2 2 0 0 1 10.494 4h3.012a2 2 0 0 1 1.664.89l.996 1.494A2 2 0 0 0 17.83 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">
              {t("Take a photo", "Tomar una foto")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {t(
                "Use your phone camera for a quick scan of printed documents.",
                "Usa la camara del telefono para escanear rapidamente documentos impresos."
              )}
            </p>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => handleSelectedFiles(event.target.files)}
        />

        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(event) => handleSelectedFiles(event.target.files)}
        />

        {(uploadState.statusMessage || uploadState.error) && (
          <div className="mt-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950 px-6 py-5">
            {uploadState.statusMessage ? (
              <p className="text-sm font-medium text-zinc-300">
                {uploadState.statusMessage}
              </p>
            ) : null}

            {uploadState.error ? (
              <p className="mt-2 text-sm leading-7 text-rose-300">
                {uploadState.error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
