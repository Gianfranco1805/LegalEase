# 🌊 DocuVoz — Bilingual Document Assistant
### 305 HackShells | April 10, 2026 | Florida International University

---

## 🎯 Project Goal

DocuVoz is a bilingual, voice-powered document assistant built for everyday Spanish-speaking users — particularly older adults and recent immigrants in the Miami community who struggle to understand English legal, financial, and administrative documents.

The app allows users to upload or photograph any everyday document — a lease, a bill, a medical form, a school letter — and receive a full Spanish translation read aloud by a natural AI voice. Users can then ask follow-up questions about the document in Spanish or English, either by typing or speaking, and receive spoken and written responses.

The goal is not just translation — it is comprehension. We want a grandmother in Hialeah to fully understand what she is signing.

---

## 🧩 What We Are Building

A mobile-friendly, accessible web application that:

1. Accepts a document via **photo capture** (mobile camera) or **PDF/image upload**
2. Extracts the text using **OCR** (Google Cloud Vision) or **PDF parsing** (PDF.js)
3. Displays the **original English text** and **Spanish translation side by side**
4. Gives the user two listening options via **ElevenLabs**:
   - 📖 **Read Full Document** — entire translation read aloud
   - ✨ **Summarize Key Points** — AI highlights and reads the most important parts
5. Opens a **bilingual Q&A session** where users can:
   - Type or speak their question in Spanish or English
   - Receive a spoken + written response powered by Gemini AI
   - Ask as many follow-up questions as needed
6. Saves documents to the user's account for future reference

---

## 👥 Who This Is For

| User | Problem |
|---|---|
| Spanish-speaking immigrants | Cannot fully understand English documents they must sign |
| Older adults (55+) | Overwhelmed by complex legal or medical language |
| Families | Helping a parent or grandparent navigate paperwork |
| Anyone | Who receives confusing English documents |

**Primary focus:** Spanish speakers in Miami who deal with everyday English documents and need both translation and true comprehension.

---

## 🗺️ Target Document Types

We are not building a specialized legal tool. We are targeting **everyday documents** that real people receive and struggle with:

- Utility bills & notices
- Lease agreements & landlord letters
- Medical forms & insurance documents
- School letters & permission slips
- Bank statements & credit card notices
- Government correspondence

---

## ✅ Design Parameters

### Accessibility First
- **Minimal UI** — no more than 2-3 visible actions at any point
- **Large text and buttons** — readable without zooming
- **Clear user flow** — first glance should tell the user exactly what to do
- **No technical jargon** in the interface
- Voice as a primary interaction method, not an afterthought

### Bilingual Interface
- The app UI itself is bilingual (English + Spanish toggle)
- All AI responses available in both languages
- ElevenLabs voice output defaults to Spanish but is configurable

### Mobile Friendly
- Camera capture as a first-class feature on mobile
- Responsive layout that works cleanly on any screen size
- Touch-friendly buttons and interactions

### Secure & Private
- User authentication via Clerk
- Documents stored securely in Supabase Storage tied to individual accounts
- API keys never exposed client-side
- Users can delete their documents at any time

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript (via Next.js) + Tailwind CSS |
| Deployment | Vercel |
| Authentication | Clerk |
| Backend Logic | Next.js API Routes (TypeScript) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| OCR (photo → text) | Google Cloud Vision API (GCP credits) |
| PDF Text Extraction | PDF.js (client-side, free) |
| AI Translation + Q&A | Gemini Sonnet API ($15 LLM credits) |
| Voice Output | ElevenLabs API |
| Voice Input | Web Speech API (built into browser, free) |

> **Note on the frontend stack:** Next.js is a React framework with TypeScript support built in. Initializing with `--typescript` gives you full React + TypeScript without needing a separate backend server. All API routes are written in TypeScript as well.

---

## 🏆 Competition Targets

| Prize | Track |
|---|---|
| **$500 Amazon Gift Card** | Best overall project — 305 LawTech & Compliance Build (Track 1) |
| **ElevenLabs Prize** | Best project using ElevenLabs API |

**Why we win Track 1:** We are directly solving a law and compliance comprehension problem for an underserved community. The Miami demographic context makes our use case undeniably real.

**Why we win the ElevenLabs prize:** ElevenLabs is not a background feature — it is the primary interface. The voice is how users consume and interact with their documents.

---

## 🚀 Demo Flow (Pitch Script)

1. Open app on mobile → clean bilingual landing screen
2. Tap "Take a Photo" → photograph a utility bill
3. Side-by-side view appears: English original + Spanish translation
4. Tap "Summarize Key Points" → ElevenLabs voice reads the highlights in natural Spanish
5. Tap the mic → ask *"¿Cuándo tengo que pagar?"* (When do I have to pay?)
6. AI responds in spoken + written Spanish with the answer
7. Show saved documents in user account

**Pitch line:** *"Forty percent of Miami residents speak Spanish as a primary language. Most documents they receive do not. DocuVoz closes that gap — not just by translating, but by making sure they truly understand."*
