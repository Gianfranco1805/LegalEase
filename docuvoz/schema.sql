create table if not exists public.document_sources (
  id bigint generated always as identity primary key,
  name text not null unique,
  jurisdiction_level text not null check (jurisdiction_level in ('national', 'florida')),
  organization text not null,
  base_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_documents (
  id bigint generated always as identity primary key,
  source_id bigint references public.document_sources(id) on delete set null,

  title text not null,
  form_number text,
  jurisdiction_level text not null check (jurisdiction_level in ('national', 'florida')),
  state_code text,
  category text,
  subcategory text,
  doc_kind text check (doc_kind in ('form', 'instruction', 'unknown')) default 'unknown',
  language text not null default 'en',

  source_page_url text not null,
  original_file_url text not null unique,

  storage_bucket text not null,
  storage_path text not null unique,

  file_name text not null,
  file_ext text,
  mime_type text,
  file_size_bytes bigint,
  sha256_hash text unique,

  is_fillable_pdf boolean not null default false,
  page_count integer,

  extraction_status text not null default 'not_attempted'
    check (extraction_status in ('not_attempted', 'success', 'partial', 'failed')),
  scrape_status text not null default 'downloaded'
    check (scrape_status in ('discovered', 'downloaded', 'uploaded', 'indexed', 'failed')),

  published_date date,
  revision_label text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_text (
  document_id bigint primary key references public.legal_documents(id) on delete cascade,
  extracted_text text,
  extraction_method text check (extraction_method in ('pdf', 'docx', 'ocr', 'none')) default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scrape_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  max_files integer not null,
  national_target integer not null,
  florida_target integer not null,
  uploaded_count integer not null default 0,
  skipped_duplicates integer not null default 0,
  failed_count integer not null default 0,
  notes text
);

create index if not exists idx_legal_documents_jurisdiction on public.legal_documents (jurisdiction_level);
create index if not exists idx_legal_documents_category on public.legal_documents (category);
create index if not exists idx_legal_documents_doc_kind on public.legal_documents (doc_kind);
create index if not exists idx_legal_documents_hash on public.legal_documents (sha256_hash);

-- Future migration note for private user uploads:
-- 1. Create private storage buckets named `privateLegalDocs` and `privateDocData`.
-- 2. If you want private uploads to be modeled distinctly from scraped corpus data,
--    either add a dedicated `private_documents` table or relax the jurisdiction
--    constraint here to include a value like `private`.
-- 3. The app upload flow now stores a language value per uploaded document and
--    writes mirrored JSON metadata into the privateDocData bucket.
