import JSZip from "jszip";
import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";
import { unzip, zip, readZipFile, writeZipFile } from "../utils/zip";
import { parseXml, buildXml, walkNodes } from "../processors/xml-helpers";
import { remapXlsxFonts } from "../processors/font-mapper";

interface XlsxFileData {
  jszip: JSZip;
  hasSharedStrings: boolean;
  sheetPaths: string[];
}

export class XlsxParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const jszip = await unzip(buffer);
    const segments: { id: string; text: string; path: string }[] = [];
    let hasSharedStrings = false;
    const sheetPaths: string[] = [];

    // Parse shared strings
    const ssFile = jszip.file("xl/sharedStrings.xml");
    if (ssFile) {
      hasSharedStrings = true;
      const content = await readZipFile(jszip, "xl/sharedStrings.xml");
      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "t", (node) => {
        const children = (node as Record<string, unknown>)["t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `xlsx-ss-${segIdx++}`;
                segments.push({ id, text, path: "xl/sharedStrings.xml" });
              }
            }
          }
        }
      });
    }

    // Also check for inline strings in sheets
    const sheetFiles = jszip.file(/xl\/worksheets\/sheet\d+\.xml/);
    for (const sheetFile of sheetFiles) {
      sheetPaths.push(sheetFile.name);
      const content = await sheetFile.async("string");
      const xmlObj = parseXml(content);
      let segIdx = 0;

      // Look for inline strings (is nodes with t children)
      walkNodes(xmlObj, "is", (isNode) => {
        const isChildren = (isNode as Record<string, unknown>)["is"];
        if (!Array.isArray(isChildren)) return;

        walkNodes(isChildren, "t", (tNode) => {
          const tChildren = (tNode as Record<string, unknown>)["t"];
          if (Array.isArray(tChildren)) {
            for (const child of tChildren) {
              const c = child as Record<string, unknown>;
              if (c["#text"] !== undefined) {
                const text = String(c["#text"]);
                if (text.trim().length > 0) {
                  const id = `xlsx-inline-${sheetFile.name}-${segIdx++}`;
                  segments.push({ id, text, path: sheetFile.name });
                }
              }
            }
          }
        });
      });
    }

    return { segments, fileData: { jszip, hasSharedStrings, sheetPaths } as XlsxFileData };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { jszip, hasSharedStrings, sheetPaths } = parseResult.fileData as XlsxFileData;
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    // Update shared strings
    if (hasSharedStrings) {
      const content = await readZipFile(jszip, "xl/sharedStrings.xml");
      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "t", (node) => {
        const children = (node as Record<string, unknown>)["t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `xlsx-ss-${segIdx++}`;
                const translated = translationMap.get(id);
                if (translated) {
                  c["#text"] = translated;
                }
              }
            }
          }
        }
      });

      await writeZipFile(jszip, "xl/sharedStrings.xml", buildXml(xmlObj));
    }

    // Update inline strings in sheets
    for (const sheetPath of sheetPaths) {
      const content = await readZipFile(jszip, sheetPath);
      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "is", (isNode) => {
        const isChildren = (isNode as Record<string, unknown>)["is"];
        if (!Array.isArray(isChildren)) return;

        walkNodes(isChildren, "t", (tNode) => {
          const tChildren = (tNode as Record<string, unknown>)["t"];
          if (Array.isArray(tChildren)) {
            for (const child of tChildren) {
              const c = child as Record<string, unknown>;
              if (c["#text"] !== undefined) {
                const text = String(c["#text"]);
                if (text.trim().length > 0) {
                  const id = `xlsx-inline-${sheetPath}-${segIdx++}`;
                  const translated = translationMap.get(id);
                  if (translated) {
                    c["#text"] = translated;
                  }
                }
              }
            }
          }
        });
      });

      await writeZipFile(jszip, sheetPath, buildXml(xmlObj));
    }

    // Remap fonts in styles
    const stylesFile = jszip.file("xl/styles.xml");
    if (stylesFile) {
      const stylesContent = await readZipFile(jszip, "xl/styles.xml");
      const stylesObj = parseXml(stylesContent);
      remapXlsxFonts(stylesObj, targetLang);
      await writeZipFile(jszip, "xl/styles.xml", buildXml(stylesObj));
    }

    return zip(jszip);
  }
}
