import JSZip from "jszip";
import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";
import { unzip, zip, readZipFile, writeZipFile } from "../utils/zip";
import { parseXml, buildXml, walkNodes } from "../processors/xml-helpers";
import { remapPptxFonts } from "../processors/font-mapper";
import { adjustPptxTextBoxes } from "../processors/text-adjuster";

interface PptxFileData {
  jszip: JSZip;
  slidePaths: string[];
}

export class PptxParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const jszip = await unzip(buffer);
    const segments: { id: string; text: string; path: string }[] = [];

    // Find all slide files
    const slideFiles = jszip.file(/ppt\/slides\/slide\d+\.xml/);
    const slidePaths = slideFiles.map((f) => f.name).sort();

    for (const slidePath of slidePaths) {
      const content = await readZipFile(jszip, slidePath);
      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "a:t", (node) => {
        const children = (node as Record<string, unknown>)["a:t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `pptx-${slidePath}-${segIdx++}`;
                segments.push({ id, text, path: slidePath });
              }
            }
          }
        }
      });
    }

    return { segments, fileData: { jszip, slidePaths } as PptxFileData };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { jszip, slidePaths } = parseResult.fileData as PptxFileData;
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    for (const slidePath of slidePaths) {
      const content = await readZipFile(jszip, slidePath);
      const xmlObj = parseXml(content);
      let segIdx = 0;

      // Collect original and translated texts for text box adjustment
      const originalTexts = new Map<string, string>();
      const translatedTexts = new Map<string, string>();

      walkNodes(xmlObj, "a:t", (node) => {
        const children = (node as Record<string, unknown>)["a:t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `pptx-${slidePath}-${segIdx++}`;
                const translated = translationMap.get(id);
                originalTexts.set(id, text);
                if (translated) {
                  c["#text"] = translated;
                  translatedTexts.set(id, translated);
                } else {
                  translatedTexts.set(id, text);
                }
              }
            }
          }
        }
      });

      // Adjust text boxes for text length changes
      adjustPptxTextBoxes(xmlObj, originalTexts, translatedTexts);

      // Remap fonts
      remapPptxFonts(xmlObj, targetLang);

      await writeZipFile(jszip, slidePath, buildXml(xmlObj));
    }

    return zip(jszip);
  }
}
