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

export type DocumentLanguage = "en" | "es" | "ht" | "other";

export type UploadDocumentResponse = {
  data: {
    id: number;
    title: string;
    language: string;
    extraction_status: string;
    extractionStatus?: string;
    storage_path: string;
    storagePath?: string;
    metadata_path: string;
    metadataPath?: string;
    storageBucket?: string;
    metadataBucket?: string;
  };
};

export type PrivateDocumentListItem = {
  id: number;
  title: string;
  language: string;
  file_name: string;
  mime_type: string | null;
  extraction_status: string;
  created_at: string;
  translation_status?: string;
  summary_status?: string;
  translated_pdf_path?: string | null;
  translated_text_path?: string | null;
  summary_es?: string | null;
};
