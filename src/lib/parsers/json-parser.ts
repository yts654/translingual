import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";

interface JsonFileData {
  original: unknown;
  paths: { id: string; path: string[] }[];
}

export class JsonParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const text = new TextDecoder("utf-8").decode(buffer);
    const obj = JSON.parse(text);
    const segments: { id: string; text: string; path: string }[] = [];
    const paths: { id: string; path: string[] }[] = [];

    function walk(value: unknown, currentPath: string[]) {
      if (typeof value === "string" && value.trim().length > 0) {
        const id = `json-${segments.length}`;
        const pathStr = currentPath.join(".");
        segments.push({ id, text: value, path: pathStr });
        paths.push({ id, path: [...currentPath] });
      } else if (Array.isArray(value)) {
        value.forEach((item, idx) => walk(item, [...currentPath, String(idx)]));
      } else if (value && typeof value === "object") {
        for (const [key, val] of Object.entries(value)) {
          walk(val, [...currentPath, key]);
        }
      }
    }

    walk(obj, []);
    return { segments, fileData: { original: obj, paths } as JsonFileData };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    _targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { original, paths } = parseResult.fileData as JsonFileData;
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    // Deep clone
    const result = JSON.parse(JSON.stringify(original));

    for (const { id, path } of paths) {
      const translated = translationMap.get(id);
      if (!translated) continue;

      let current: Record<string, unknown> = result;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] as Record<string, unknown>;
      }
      current[path[path.length - 1]] = translated;
    }

    const json = JSON.stringify(result, null, 2);
    return new TextEncoder().encode(json).buffer as ArrayBuffer;
  }
}
