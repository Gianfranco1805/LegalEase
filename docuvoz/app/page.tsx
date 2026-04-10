"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-black text-white relative">

      <main className="flex flex-col items-center justify-center w-full max-w-4xl px-6 py-20 text-center z-10">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-300 text-sm font-medium mb-8 border border-zinc-800">
          {t("Your bilingual document assistant", "Tu asistente bilingüe de documentos")}
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-zinc-100">
          {t("Understand any document,", "Entiende cualquier documento,")} <br className="hidden md:block" />
          <span className="text-zinc-500">
            {t("in your language.", "en tu idioma.")}
          </span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl leading-relaxed">
          {t(
            "DocuVoz helps Spanish-speaking communities easily translate, summarize, and understand important documents. Upload a file or snap a photo to get started.",
            "DocuVoz ayuda a las comunidades de habla hispana a traducir, resumir y entender fácilmente documentos importantes. Sube un archivo o toma una foto."
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-5 w-full justify-center">
          <Link
            href="/upload"
            className="flex h-14 w-full sm:w-64 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 text-black text-lg font-semibold hover:bg-white transition-all"
          >
            {t("New Document", "Nuevo Documento")}
          </Link>
          
          <Link
            href="/documents"
            className="flex h-14 w-full sm:w-64 items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-6 text-zinc-300 text-lg font-semibold hover:bg-zinc-800 hover:text-white transition-all"
          >
            {t("Translated Docs", "Docs Traducidos")}
          </Link>
        </div>
      </main>
    </div>
  );
}
