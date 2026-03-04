import Papa from "papaparse";
import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";

export class CsvParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const text = new TextDecoder("utf-8").decode(buffer);
    const parsed = Papa.parse<string[]>(text, { header: false });
    const rows = parsed.data;

    const segments = rows.flatMap((row, rowIdx) =>
      row
        .map((cell, colIdx) => ({
          id: `cell-${rowIdx}-${colIdx}`,
          text: cell,
          path: `row:${rowIdx},col:${colIdx}`,
        }))
        .filter((s) => s.text.trim().length > 0)
    );

    return { segments, fileData: { rows } };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    _targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { rows } = parseResult.fileData as { rows: string[][] };
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    const result = rows.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        const id = `cell-${rowIdx}-${colIdx}`;
        return translationMap.get(id) ?? cell;
      })
    );

    const csv = Papa.unparse(result);
    return new TextEncoder().encode(csv).buffer as ArrayBuffer;
  }
}
