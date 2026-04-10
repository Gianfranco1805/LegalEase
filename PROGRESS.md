# 📋 DocuVoz — Developer Progress & Task Plan
### 305 HackShells | April 10, 2026 | 7:00 AM – 7:00 PM

---

## ⏱️ Timeline Overview

| Phase | Time | Goal |
|---|---|---|
| **Phase 0 — Setup** | 7:00 – 8:00 AM | Repo, accounts, API keys, environment all working |
| **Phase 1 — Foundation** | 8:00 – 10:30 AM | Auth, storage, document input, text extraction |
| **Phase 2 — Core Features** | 10:30 AM – 2:00 PM | Translation, side-by-side view, ElevenLabs voice |
| **Phase 3 — Q&A + Polish** | 2:00 – 5:00 PM | Conversational Q&A, voice input, UI refinement |
| **Phase 4 — Demo Prep** | 5:00 – 7:00 PM | End-to-end testing, pitch practice, final fixes |

---

## 🚦 Phase 0 — Team Setup (All 4 Developers | 7:00 – 8:00 AM)

Everyone does this together before branching off.

- [ ] Create GitHub repo, set up `main` and individual dev branches
- [ ] Initialize Next.js project with React + TypeScript and Tailwind CSS:
  ```bash
  npx create-next-app@latest docuvoz --typescript --tailwind --app
  ```
- [ ] Deploy skeleton app to Vercel and confirm it works
- [ ] Set up Clerk account and add to project
- [ ] Set up Supabase project (database + storage bucket)
- [ ] Create `.env.local` file with all API keys:
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `GOOGLE_CLOUD_VISION_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `ELEVENLABS_API_KEY`
- [ ] Share `.env.local` securely with all team members (do NOT commit to GitHub)
- [ ] Confirm everyone can run the project locally

> ✅ Exit condition: App runs locally, deploys to Vercel, Clerk login screen appears

---

## 👤 Developer 1 — Auth, Storage & Document Input

**Branch:** `dev/auth-storage`

**Responsibility:** Users can log in, upload or photograph a document, and have it saved to their account.

---

### Phase 1 Tasks (8:00 – 10:30 AM)

#### Clerk Authentication
- [ ] Wrap app in `<ClerkProvider>`
- [ ] Add sign-in / sign-up pages using Clerk's prebuilt components
- [ ] Protect all main routes — unauthenticated users redirect to login
- [ ] Pull `userId` from Clerk session for all Supabase operations

#### Supabase Schema Setup
- [ ] Create `documents` table:
```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  file_name text,
  file_url text,
  extracted_text text,
  translated_text text,
  created_at timestamp default now()
);
```
- [ ] Create `conversations` table:
```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  user_id text not null,
  role text check (role in ('user', 'assistant')),
  message text,
  created_at timestamp default now()
);
```
- [ ] Set up Supabase Storage bucket called `documents` (private)
- [ ] Set RLS (Row Level Security) policies so users only see their own data

#### Document Upload UI
- [ ] Build upload screen with two options: "Upload File" and "Take a Photo"
- [ ] File upload: accept PDF and image files (JPG, PNG)
- [ ] Camera capture: use `<input type="file" accept="image/*" capture="environment">` for mobile
- [ ] On upload: store file in Supabase Storage, save record to `documents` table
- [ ] Show upload progress indicator

---

### Phase 2 Tasks (10:30 AM – 2:00 PM)

#### Saved Documents Page
- [ ] Build a "My Documents" page showing all past uploads for the logged-in user
- [ ] Each document card shows: file name, date uploaded, button to re-open
- [ ] Clicking a document loads it back into the main view with its saved translation
- [ ] Add delete document option

---

### Phase 3 Tasks (2:00 – 5:00 PM)

- [ ] Bug fixes and integration support
- [ ] Make sure document saving works end-to-end with Dev 2's extraction flow
- [ ] Add loading states and error messages throughout upload flow
- [ ] Test on mobile — camera capture must work smoothly

---

## 👤 Developer 2 — OCR, Text Extraction & AI Translation/Q&A

**Branch:** `dev/ocr-translation`

**Responsibility:** Extract text from documents, translate to Spanish, and power the Q&A brain.

---

### Phase 1 Tasks (8:00 – 10:30 AM)

#### PDF Text Extraction
- [ ] Install PDF.js: `npm install pdfjs-dist`
- [ ] Build client-side PDF parser that extracts raw text from uploaded PDFs
- [ ] Handle multi-page PDFs, concatenate text cleanly

#### Google Cloud Vision OCR (for photos/images)
- [ ] Set up Google Cloud Vision API in Next.js API route (`/api/ocr`)
- [ ] Send base64 image to Vision API, receive extracted text
- [ ] Handle cases where image quality is poor — return a clear error message

---

### Phase 2 Tasks (10:30 AM – 2:00 PM)

#### Gemini Translation
- [ ] Set up Gemini SDK in API route (`/api/translate`)
- [ ] Write the translation prompt:
```
You are a helpful bilingual assistant. Translate the following English document 
into clear, simple Spanish that is easy for non-native speakers and older adults 
to understand. Do not use complex legal jargon. Return only the translated text.

Document:
{extracted_text}
```
- [ ] Return translated text to frontend
- [ ] Save translated text to Supabase `documents` table

#### Gemini Summary
- [ ] Add a `/api/summarize` route
- [ ] Write the summary prompt:
```
You are a helpful bilingual assistant. Read the following English document and 
identify the 3-5 most important points a person must understand. Return them 
in simple, clear Spanish as a short numbered list. Focus on: deadlines, amounts 
owed, actions required, and key terms.

Document:
{extracted_text}
```
- [ ] Return summary + indicate which sentences in the original text correspond 
  to each key point (for Dev 4's highlight feature)

---

### Phase 3 Tasks (2:00 – 5:00 PM)

#### Gemini Q&A
- [ ] Set up `/api/chat` route
- [ ] Build conversation handler — pass full document text + conversation history + new question to Gemini
- [ ] Write the Q&A system prompt:
```
You are a bilingual document assistant helping a Spanish-speaking user understand 
a document. You have access to the full document below. Answer the user's questions 
in the same language they ask in (Spanish or English). Use simple, clear language. 
If the answer is not in the document, say so clearly.

Document:
{document_text}

Conversation so far:
{conversation_history}
```
- [ ] Save each message (user + assistant) to Supabase `conversations` table
- [ ] Handle conversation history loading when user returns to a document

---

## 👤 Developer 3 — ElevenLabs Voice Output & Voice Input

**Branch:** `dev/voice`

**Responsibility:** All audio — ElevenLabs text-to-speech and browser voice input.

---

### Phase 1 Tasks (8:00 – 10:30 AM)

#### ElevenLabs Setup
- [ ] Create ElevenLabs account and get API key
- [ ] Explore available Spanish voices in the ElevenLabs dashboard — pick 2-3 good options
- [ ] Build `/api/speak` route:
```javascript
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: textToSpeak,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  }
);
const audioBuffer = await response.arrayBuffer();
```
- [ ] Return audio as a stream to the frontend
- [ ] Test that Spanish text is read naturally

---

### Phase 2 Tasks (10:30 AM – 2:00 PM)

#### Audio Playback UI Component
- [ ] Build `<AudioPlayer>` component that:
  - Receives text from parent
  - Calls `/api/speak`, plays the returned audio
  - Shows play/pause/stop controls
  - Shows a loading spinner while audio is being generated
- [ ] Wire up to "Read Full Document" button — sends full Spanish translation
- [ ] Wire up to "Summarize Key Points" button — sends summary text

#### Voice Persona Picker
- [ ] Build a simple voice selector UI — 2 or 3 named personas (e.g. "Clara", "Miguel", "Rosa")
- [ ] Each persona maps to a different ElevenLabs voice ID
- [ ] Save selected voice to localStorage so it persists

---

### Phase 3 Tasks (2:00 – 5:00 PM)

#### Voice Input (Web Speech API)
- [ ] Build a `<VoiceInput>` component using the browser's Web Speech API:
```javascript
const recognition = new window.webkitSpeechRecognition();
recognition.lang = 'es-ES'; // Spanish
recognition.onresult = (e) => setTranscript(e.results[0][0].transcript);
recognition.start();
```
- [ ] Add a microphone button to the Q&A input field
- [ ] When user stops speaking, transcript populates the text input automatically
- [ ] User can edit before submitting if needed
- [ ] Make sure voice input also works for English questions (detect or let user toggle)

#### Q&A Voice Response
- [ ] After Gemini returns a Q&A answer, automatically send it to ElevenLabs and play it
- [ ] Show a visual indicator that audio is playing
- [ ] Allow user to replay the last response

---

## 👤 Developer 4 — UI/UX, Layout & Frontend Integration

**Branch:** `dev/ui`

**Responsibility:** The entire visual experience — how the app looks, feels, and flows. Also responsible for connecting all pieces together.

---

### Phase 1 Tasks (8:00 – 10:30 AM)

#### App Shell & Navigation
- [ ] Confirm TypeScript is configured — check `tsconfig.json` exists and `strict: true` is set
- [ ] Define shared types in `/types/index.ts` for the whole team to use:
```typescript
export type Document = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  extracted_text: string;
  translated_text: string;
  created_at: string;
};

export type Message = {
  role: "user" | "assistant";
  message: string;
  created_at: string;
};

export type Voice = {
  id: string;
  name: string;
  language: "es" | "en";
};
```
- [ ] Share this file with all developers so everyone uses the same types
- [ ] Build the main app layout: header with logo, language toggle (EN/ES), user avatar
- [ ] Set up page routing:
  - `/` — landing/home page
  - `/upload` — document upload screen
  - `/document/[id]` — main document view
  - `/documents` — saved documents list
- [ ] Build landing page: clear headline, two large buttons ("Upload Document" / "Take a Photo"), tagline in English and Spanish

#### Bilingual UI System
- [ ] Create a simple language context (`useLanguage` hook) that toggles all UI labels
- [ ] Write English and Spanish versions of all UI text labels
- [ ] Language toggle button in header switches the entire interface instantly

---

### Phase 2 Tasks (10:30 AM – 2:00 PM)

#### Side-by-Side Document View
- [ ] Build the main document view layout:
  - Left panel: original English text
  - Right panel: Spanish translation
  - On mobile: tabs to switch between English / Spanish views
- [ ] Style both panels cleanly — large readable font (min 16px), good line spacing
- [ ] Add action buttons prominently above the panels:
  - "📖 Leer Documento Completo / Read Full Document"
  - "✨ Resumir Puntos Clave / Summarize Key Points"

#### Highlight Feature
- [ ] When "Summarize Key Points" is selected, receive key point locations from Dev 2
- [ ] Highlight corresponding sentences in the English panel with a subtle yellow background
- [ ] Animate highlights appearing as each point is read aloud

---

### Phase 3 Tasks (2:00 – 5:00 PM)

#### Q&A Panel
- [ ] Build collapsible Q&A panel that opens below the document view after listening options
- [ ] Chat bubble UI — user messages on right (blue), assistant on left (white)
- [ ] Text input field + microphone button (from Dev 3) side by side
- [ ] "Send" button — large and tap-friendly
- [ ] Auto-scroll to latest message
- [ ] Show typing indicator while Gemini is responding

#### Mobile Responsiveness & Accessibility
- [ ] Test every screen on a phone screen size
- [ ] Ensure all tap targets are at least 48x48px
- [ ] Use minimum 18px font for body text, 22px+ for headings
- [ ] High contrast colors — pass basic WCAG AA contrast ratio
- [ ] Remove any unnecessary buttons or UI clutter
- [ ] Final UI should feel like: upload → listen → ask questions. Three steps, nothing more.

#### Polish & Integration
- [ ] Connect all API calls to real endpoints from Dev 2 and Dev 3
- [ ] Add loading states for every async action (spinner, skeleton screens)
- [ ] Add error states with friendly bilingual messages
- [ ] Test full end-to-end flow: photo → extract → translate → voice → Q&A

---

## 🔗 Integration Checkpoints (All Developers)

| Time | Checkpoint |
|---|---|
| 10:30 AM | Dev 1 + Dev 2: Document uploads and text extraction working together |
| 12:30 PM | Dev 2 + Dev 3: Translation text successfully sent to ElevenLabs and played |
| 2:00 PM | Dev 3 + Dev 4: Voice input populates Q&A field, responses play audio |
| 4:00 PM | Full end-to-end demo working — all 4 developers test together |
| 5:00 PM | Freeze features, switch to polish and demo prep only |

---

## 🎤 Demo Prep (5:00 – 7:00 PM | All Developers)

- [ ] Prepare one real document to use in the demo (a utility bill or simple letter)
- [ ] Run through the full demo flow 3 times until it is smooth
- [ ] Prepare the one-sentence pitch: *"DocuVoz helps Spanish-speaking Miami residents fully understand English documents — through translation, voice, and conversation."*
- [ ] Each team member knows which part of the product they will explain
- [ ] Have a backup plan if any API fails (screenshots or recorded video of the flow)
- [ ] Deploy final version to Vercel and confirm the live URL works

---

## ⚠️ Ground Rules

- **Commit often** — push to your branch every hour minimum
- **Never commit `.env.local`** — add it to `.gitignore` immediately
- **Ask for help early** — if you are stuck for more than 20 minutes, speak up
- **Feature freeze at 5:00 PM** — no new features after this, polish only
- **One person merges to main** — avoid conflicts by coordinating merges at checkpoints
