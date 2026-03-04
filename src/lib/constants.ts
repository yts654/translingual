export const SUPPORTED_LANGUAGES = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export const FONT_MAP: Record<LanguageCode, { docx: string; pptx: string; xlsx: string }> = {
  ja: { docx: "Yu Gothic", pptx: "Yu Gothic", xlsx: "Yu Gothic" },
  en: { docx: "Calibri", pptx: "Calibri", xlsx: "Calibri" },
  vi: { docx: "Times New Roman", pptx: "Arial", xlsx: "Arial" },
};

export const BATCH_SIZE = 50;
export const BATCH_CHAR_LIMIT = 8000;
export const MAX_CONCURRENT_REQUESTS = 3;
export const MAX_RETRIES = 3;

export const SUPPORTED_EXTENSIONS = [
  ".docx", ".xlsx", ".pptx",
  ".txt", ".csv", ".md", ".json",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const CJK_CHAR_WIDTH = 2.0;
export const LATIN_CHAR_WIDTH = 1.0;
