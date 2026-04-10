"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function DocumentTranslatorPage() {
  const { t } = useLanguage();
  
  // Highlighting mock state
  const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);

  const englishText = [
    "This is a legal notification regarding your recent application.",
    "Your permit has been successfully approved by the local council.",
    "Please ensure you carry a printed copy of this document at all times.",
    "If you have any questions, please contact the support office."
  ];

  const spanishText = [
    "Esta es una notificación legal sobre su solicitud reciente.",
    "Su permiso ha sido aprobado exitosamente por el consejo local.",
    "Asegúrese de llevar una copia impresa de este documento en todo momento.",
    "Si tiene alguna pregunta, comuníquese con la oficina de soporte."
  ];

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      
      {/* Top Action Bar */}
      <div className="h-16 border-b border-zinc-800 bg-black flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/documents" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("Back", "Regresar")}
          </Link>
          <div className="h-4 w-px bg-zinc-800"></div>
          <h1 className="text-sm font-semibold text-zinc-200">Legal_Permit_Document.pdf</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-black bg-zinc-200 hover:bg-white rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            {t("Read Aloud", "Leer en voz alta")}
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {t("Copy Text", "Copiar Texto")}
          </button>
        </div>
      </div>

      {/* Side-by-Side Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Original English */}
        <div className="flex-1 border-r border-zinc-800 bg-zinc-950 p-8 overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              {t("Original Document", "Documento Original")} (English)
            </h2>
          </div>
          <div className="max-w-2xl mx-auto bg-black p-8 rounded-xl border border-zinc-800 shadow-2xl space-y-6 text-zinc-300 leading-relaxed font-serif">
            {englishText.map((text, index) => (
              <p 
                key={index}
                className={`transition-colors duration-300 p-2 rounded-lg cursor-default ${hoveredParagraph === index ? 'bg-zinc-800/80 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-zinc-700' : 'border border-transparent'}`}
                onMouseEnter={() => setHoveredParagraph(index)}
                onMouseLeave={() => setHoveredParagraph(null)}
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Right Side: Translated Spanish */}
        <div className="flex-1 bg-black p-8 overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              {t("Translation", "Traducción")} (Español)
            </h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-6 text-zinc-200 leading-relaxed font-serif text-lg">
             {spanishText.map((text, index) => (
              <p 
                key={index}
                className={`transition-colors duration-300 p-2 rounded-lg cursor-default ${hoveredParagraph === index ? 'bg-zinc-800/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] border border-emerald-900/50' : 'border border-transparent'}`}
                onMouseEnter={() => setHoveredParagraph(index)}
                onMouseLeave={() => setHoveredParagraph(null)}
              >
                {text}
              </p>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
