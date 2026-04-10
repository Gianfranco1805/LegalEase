"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type MockDoc = { id: string; fileName: string; date: string; preview: string };

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [recentDocs, setRecentDocs] = useState<MockDoc[]>([]);

  useEffect(() => {
    const loaded = JSON.parse(localStorage.getItem("mock_recent_docs") || "[]");
    setRecentDocs(loaded);
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center bg-black text-white px-6 py-12 min-h-screen">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-end mb-10 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">
              {t("My Documents", "Mis Documentos")}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              {t("View and manage all your files.", "Ver y administrar todos tus archivos.")}
            </p>
          </div>
          <Link href="/upload" className="mb-1 text-sm font-semibold bg-zinc-100 text-black px-4 py-2 rounded-lg hover:bg-white transition-colors">
            {t("+ New", "+ Nuevo")}
          </Link>
        </div>

        {/* Recently Received Documents */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-zinc-200 mb-6">
            {t("Recently Received Documents", "Documentos Recibidos Recientemente")}
          </h2>
          
          {recentDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex flex-col p-4 border border-zinc-800 bg-zinc-950 rounded-2xl hover:border-zinc-500 transition-colors cursor-pointer group">
                  <div className="w-full h-32 bg-zinc-900 rounded-xl mb-4 overflow-hidden flex items-center justify-center border border-zinc-800">
                    {/* Fake visual preview */}
                    {doc.preview.startsWith("data:image") ? (
                      <img src={doc.preview} alt="preview" className="object-cover w-full h-full opacity-80 group-hover:scale-105 transition-transform" />
                    ) : (
                      <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <h3 className="font-medium text-zinc-300 truncate" title={doc.fileName}>{doc.fileName}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{doc.date} &bull; {t("Pending Translation", "Traducción Pendiente")}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full p-8 border border-zinc-800/50 bg-zinc-950/50 rounded-2xl text-center">
              <p className="text-zinc-600 text-sm">
                {t("No recent documents.", "No hay documentos recientes.")}
              </p>
            </div>
          )}
        </div>

        {/* Translated Docs Section */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-200 mb-6">
            {t("Translated Docs", "Documentos Traducidos")}
          </h2>
          <div className="w-full flex flex-col items-center justify-center p-16 border border-zinc-800 bg-zinc-950 rounded-2xl">
            <svg className="w-12 h-12 text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-zinc-500">
              {t("No translated documents found.", "No se encontraron documentos traducidos.")}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
