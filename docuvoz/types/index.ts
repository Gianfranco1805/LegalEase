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
