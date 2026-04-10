"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center bg-black px-6 py-16 text-white">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-8 py-12 shadow-2xl shadow-black/30">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300">
            {t("Voice-first document help", "Ayuda documental con voz primero")}
          </div>

          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-zinc-100 md:text-7xl">
            {t("Understand any document", "Entiende cualquier documento")}
            <span className="block text-zinc-500">
              {t("before you sign it.", "antes de firmarlo.")}
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
            {t(
              "Upload a bill, lease, school form, or photo and LegalEase turns it into clear Spanish, spoken aloud and ready for follow-up questions.",
              "Sube una factura, contrato, formulario escolar o foto y LegalEase lo convierte en espa ol claro, con voz y listo para preguntas."
            )}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <Link
              href="/upload"
              className="flex h-14 items-center justify-center rounded-2xl bg-zinc-100 px-6 text-lg font-semibold text-black transition hover:bg-white sm:w-64"
            >
              {t("Upload a document", "Subir documento")}
            </Link>
            <Link
              href="/upload?mode=camera"
              className="flex h-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-6 text-lg font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 sm:w-64"
            >
              {t("Take a photo", "Tomar una foto")}
            </Link>
            <Link
              href="/documents"
              className="flex h-14 items-center justify-center rounded-2xl border border-emerald-700/60 bg-emerald-500/10 px-6 text-lg font-semibold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/15 sm:w-64"
            >
              {t("View uploaded documents", "Ver documentos subidos")}
            </Link>
          </div>
        </section>

        <section className="grid gap-4">
          {[
            {
              title: t("1. Upload or snap", "1. Sube o toma foto"),
              body: t(
                "PDFs and phone photos both work. Large tap targets keep the flow simple.",
                "Funcionan PDFs y fotos del tel fono. Los botones grandes mantienen el flujo simple."
              ),
            },
            {
              title: t("2. Read in Spanish", "2. Lee en espa ol"),
              body: t(
                "See the original English beside a clear Spanish translation and listen out loud.",
                "Ve el ingl s original junto a una traducci n clara al espa ol y esc chalo en voz alta."
              ),
            },
            {
              title: t("3. Save for later", "3. Gu rdalo"),
              body: t(
                "Return to your documents anytime from your dashboard.",
                "Vuelve a tus documentos cuando quieras desde tu panel."
              ),
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950 px-6 py-6"
            >
              <h2 className="text-xl font-bold text-zinc-100">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{item.body}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
