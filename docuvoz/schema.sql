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

create table if not exists public.private_documents (
  id bigint generated always as identity primary key,
  user_id text not null,

  title text not null,
  language text not null default 'en',

  storage_bucket text not null default 'privateLegalDocs',
  storage_path text not null unique,
  metadata_bucket text not null default 'privateDocData',
  metadata_path text not null unique,

  file_name text not null,
  file_ext text,
  mime_type text,
  file_size_bytes bigint,
  sha256_hash text,

  is_fillable_pdf boolean not null default false,
  page_count integer,

  extraction_status text not null default 'not_attempted'
    check (extraction_status in ('not_attempted', 'success', 'partial', 'failed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_document_text (
  document_id bigint primary key references public.private_documents(id) on delete cascade,
  extracted_text text,
  extraction_method text check (extraction_method in ('pdf', 'docx', 'ocr', 'none')) default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_document_translations (
  id bigint generated always as identity primary key,
  document_id bigint not null unique references public.private_documents(id) on delete cascade,
  user_id text not null,
  target_language text not null default 'es',

  translation_status text not null default 'not_started'
    check (translation_status in ('not_started', 'processing', 'completed', 'failed')),
  summary_status text not null default 'not_started'
    check (summary_status in ('not_started', 'processing', 'completed', 'failed')),

  translated_text_bucket text not null default 'spanishLegalDocsTranslated',
  translated_text_path text unique,
  translated_pdf_bucket text not null default 'spanishLegalDocs',
  translated_pdf_path text unique,
  metadata_bucket text not null default 'privateDocData',
  metadata_path text unique,

  translation_model text,
  summary_model text,
  translated_text text,
  summary_es text,
  summary_points_json jsonb,
  translated_at timestamptz,
  last_error text,

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
create index if not exists idx_private_documents_user_id on public.private_documents (user_id);
create index if not exists idx_private_documents_language on public.private_documents (language);
create index if not exists idx_private_documents_hash on public.private_documents (sha256_hash);
create index if not exists idx_private_document_translations_document_id on public.private_document_translations (document_id);
create index if not exists idx_private_document_translations_user_id on public.private_document_translations (user_id);
create index if not exists idx_private_document_translations_status on public.private_document_translations (translation_status);

alter table public.private_documents enable row level security;
alter table public.private_document_text enable row level security;
alter table public.private_document_translations enable row level security;

drop policy if exists "private_documents_select_own" on public.private_documents;
drop policy if exists "private_documents_insert_own" on public.private_documents;
drop policy if exists "private_documents_update_own" on public.private_documents;
drop policy if exists "private_documents_delete_own" on public.private_documents;

drop policy if exists "private_document_text_select_own" on public.private_document_text;
drop policy if exists "private_document_text_insert_own" on public.private_document_text;
drop policy if exists "private_document_text_update_own" on public.private_document_text;
drop policy if exists "private_document_text_delete_own" on public.private_document_text;

drop policy if exists "private_document_translations_select_own" on public.private_document_translations;
drop policy if exists "private_document_translations_insert_own" on public.private_document_translations;
drop policy if exists "private_document_translations_update_own" on public.private_document_translations;
drop policy if exists "private_document_translations_delete_own" on public.private_document_translations;

create policy "private_documents_select_own"
on public.private_documents
for select
using (auth.jwt() ->> 'sub' = user_id);

create policy "private_documents_insert_own"
on public.private_documents
for insert
with check (auth.jwt() ->> 'sub' = user_id);

create policy "private_documents_update_own"
on public.private_documents
for update
using (auth.jwt() ->> 'sub' = user_id)
with check (auth.jwt() ->> 'sub' = user_id);

create policy "private_documents_delete_own"
on public.private_documents
for delete
using (auth.jwt() ->> 'sub' = user_id);

create policy "private_document_text_select_own"
on public.private_document_text
for select
using (
  exists (
    select 1
    from public.private_documents d
    where d.id = private_document_text.document_id
      and d.user_id = auth.jwt() ->> 'sub'
  )
);

create policy "private_document_text_insert_own"
on public.private_document_text
for insert
with check (
  exists (
    select 1
    from public.private_documents d
    where d.id = private_document_text.document_id
      and d.user_id = auth.jwt() ->> 'sub'
  )
);

create policy "private_document_text_update_own"
on public.private_document_text
for update
using (
  exists (
    select 1
    from public.private_documents d
    where d.id = private_document_text.document_id
      and d.user_id = auth.jwt() ->> 'sub'
  )
)
with check (
  exists (
    select 1
    from public.private_documents d
    where d.id = private_document_text.document_id
      and d.user_id = auth.jwt() ->> 'sub'
  )
);

create policy "private_document_text_delete_own"
on public.private_document_text
for delete
using (
  exists (
    select 1
    from public.private_documents d
    where d.id = private_document_text.document_id
      and d.user_id = auth.jwt() ->> 'sub'
  )
);

create policy "private_document_translations_select_own"
on public.private_document_translations
for select
using (auth.jwt() ->> 'sub' = user_id);

create policy "private_document_translations_insert_own"
on public.private_document_translations
for insert
with check (auth.jwt() ->> 'sub' = user_id);

create policy "private_document_translations_update_own"
on public.private_document_translations
for update
using (auth.jwt() ->> 'sub' = user_id)
with check (auth.jwt() ->> 'sub' = user_id);

create policy "private_document_translations_delete_own"
on public.private_document_translations
for delete
using (auth.jwt() ->> 'sub' = user_id);
