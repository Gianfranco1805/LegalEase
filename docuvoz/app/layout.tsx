import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LegalEase",
  description: "Bilingual document assistant for Spanish-speaking communities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50/50">
        <ClerkProvider>
          <LanguageProvider>
            <Header />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
          </LanguageProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
