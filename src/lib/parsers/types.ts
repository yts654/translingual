import type { LanguageCode } from "../constants";

export interface TextSegment {
  id: string;
  text: string;
  path: string; // location within the document
}

export interface TranslatedSegment {
  id: string;
  original: string;
  translated: string;
}

export interface ParseResult {
  segments: TextSegment[];
  fileData: unknown; // parser-specific data needed for reconstruction
}

export interface FileParser {
  parse(buffer: ArrayBuffer): Promise<ParseResult>;
  reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    targetLang: LanguageCode
  ): Promise<ArrayBuffer>;
}

export interface TranslationRequest {
  file: File;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
}

export interface TranslationProgress {
  status: "uploading" | "parsing" | "translating" | "reconstructing" | "done" | "error";
  progress: number; // 0-100
  message: string;
  translatedCount?: number;
  totalCount?: number;
}
