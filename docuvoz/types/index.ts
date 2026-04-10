export type DocumentStatus = "processing" | "ready" | "error";

export type DocumentLanguage = "en" | "es" | "ht" | "other";

export type ExtractionStatus =
  | "not_attempted"
  | "processing"
  | "completed"
  | "failed"
  | "deferred";

export type TranslationStatus =
  | "not_started"
  | "processing"
  | "completed"
  | "failed";

export type Document = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  extracted_text: string | null;
  translated_text: string | null;
  status: DocumentStatus;
  error_message: string | null;
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

export type PrivateDocumentListItem = {
  id: number;
  title: string;
  language: DocumentLanguage;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  extractionStatus: ExtractionStatus;
  translationStatus: TranslationStatus;
  summaryStatus: TranslationStatus;
  createdAt: string;
  translatedAt: string | null;
  spanishPdfPath: string | null;
  spanishTextPath: string | null;
  summaryEs: string | null;
};

export type DocumentViewerData = {
  id: string;
  title: string;
  fileName: string;
  createdAt: string;
  mimeType: string | null;
  originalText: string | null;
  translatedText: string | null;
  summaryEs: string | null;
  summaryPoints: string[];
  translationStatus: TranslationStatus | "ready" | "unavailable";
  errorMessage: string | null;
  originalPdfUrl: string | null;
  translatedPdfUrl: string | null;
  canTranslate: boolean;
  source: "private" | "legacy";
};

export type UploadDocumentResponse = {
  data: {
    id: number;
    title: string;
    language: DocumentLanguage;
    extractionStatus: ExtractionStatus;
    extraction_status: ExtractionStatus;
    storageBucket: string;
    storagePath: string;
    storage_path: string;
    metadataBucket: string;
    metadataPath: string;
    metadata_path: string;
    translationStatus?: TranslationStatus;
    summaryStatus?: TranslationStatus;
  };
};

export type ApiError = {
  error: string;
};

export type ApiSuccess<T> = {
  data: T;
};
