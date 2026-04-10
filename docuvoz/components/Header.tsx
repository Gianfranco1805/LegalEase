"use client";

import React from "react";
import { useLanguage } from "../lib/contexts/LanguageContext";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export default function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-black border-b border-zinc-800 shadow-sm text-white">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
        
        {/* Empty left spacer to maintain justify-between balance if needed, though absolute positioning works better */}
        <div className="flex-1"></div>

        {/* Logo Section (Centered) */}
        <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 group z-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-zinc-700 to-zinc-500 shadow-lg flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
            D
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
            DocuVoz
          </span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm font-medium text-zinc-300"
          >
            {language === "en" ? "🇺🇸 EN" : "🇪🇸 ES"}
          </button>

          <div className="h-6 w-[1px] bg-zinc-700"></div>

          {isLoaded && !isSignedIn && (
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <button className="text-sm font-semibold text-zinc-300 hover:text-white px-3 py-1.5 transition-colors">
                  {t("Log In", "Iniciar Sesión")}
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm font-semibold bg-zinc-700 text-zinc-200 rounded-full px-4 py-1.5 hover:bg-zinc-600 transition-colors shadow-none border border-zinc-600">
                  {t("Sign Up", "Regístrate")}
                </button>
              </SignUpButton>
            </div>
          )}
          
          {isLoaded && isSignedIn && (
            <UserButton afterSignOutUrl="/" />
          )}
        </div>
      </div>
    </header>
  );
}
