import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";

export class MdParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const text = new TextDecoder("utf-8").decode(buffer);
    const lines = text.split("\n");

    const segments = lines
      .map((line, i) => ({
        id: `md-${i}`,
        text: line,
        path: `line:${i}`,
      }))
      .filter((s) => {
        const trimmed = s.text.trim();
        // Skip empty lines and pure formatting markers
        if (trimmed.length === 0) return false;
        if (/^[-=*_]{3,}$/.test(trimmed)) return false; // horizontal rules
        if (/^```\w*$/.test(trimmed)) return false; // code fence markers
        return true;
      });

    return { segments, fileData: { lines } };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    _targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { lines } = parseResult.fileData as { lines: string[] };
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    const result = lines.map((line, i) => {
      const id = `md-${i}`;
      const translated = translationMap.get(id);
      if (!translated) return line;

      // Preserve markdown heading markers
      const headingMatch = line.match(/^(#{1,6}\s+)/);
      if (headingMatch && !translated.startsWith("#")) {
        return headingMatch[1] + translated;
      }

      // Preserve list markers
      const listMatch = line.match(/^(\s*[-*+]\s+|\s*\d+\.\s+)/);
      if (listMatch && !translated.match(/^\s*[-*+\d]/)) {
        return listMatch[1] + translated;
      }

      return translated;
    });

    return new TextEncoder().encode(result.join("\n")).buffer as ArrayBuffer;
  }
}
