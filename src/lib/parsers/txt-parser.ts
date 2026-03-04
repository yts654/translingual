import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";

export class TxtParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const text = new TextDecoder("utf-8").decode(buffer);
    const lines = text.split("\n");
    const segments = lines
      .map((line, i) => ({
        id: `line-${i}`,
        text: line,
        path: `line:${i}`,
      }))
      .filter((s) => s.text.trim().length > 0);

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
      const id = `line-${i}`;
      return translationMap.get(id) ?? line;
    });

    return new TextEncoder().encode(result.join("\n")).buffer as ArrayBuffer;
  }
}
