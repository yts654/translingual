import JSZip from "jszip";
import type { FileParser, ParseResult, TranslatedSegment } from "./types";
import type { LanguageCode } from "../constants";
import { unzip, zip, readZipFile, writeZipFile } from "../utils/zip";
import { parseXml, buildXml, walkNodes } from "../processors/xml-helpers";
import { remapDocxFonts } from "../processors/font-mapper";

interface DocxFileData {
  jszip: JSZip;
  xmlFiles: { path: string; content: string }[];
}

const TEXT_XML_PATHS = [
  "word/document.xml",
  "word/header1.xml",
  "word/header2.xml",
  "word/header3.xml",
  "word/footer1.xml",
  "word/footer2.xml",
  "word/footer3.xml",
];

export class DocxParser implements FileParser {
  async parse(buffer: ArrayBuffer): Promise<ParseResult> {
    const jszip = await unzip(buffer);
    const segments: { id: string; text: string; path: string }[] = [];
    const xmlFiles: { path: string; content: string }[] = [];

    for (const xmlPath of TEXT_XML_PATHS) {
      const file = jszip.file(xmlPath);
      if (!file) continue;

      const content = await readZipFile(jszip, xmlPath);
      xmlFiles.push({ path: xmlPath, content });

      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "w:t", (node) => {
        const children = (node as Record<string, unknown>)["w:t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `docx-${xmlPath}-${segIdx++}`;
                segments.push({ id, text, path: xmlPath });
              }
            }
          }
        }
      });
    }

    return { segments, fileData: { jszip, xmlFiles } as DocxFileData };
  }

  async reconstruct(
    parseResult: ParseResult,
    translations: TranslatedSegment[],
    targetLang: LanguageCode
  ): Promise<ArrayBuffer> {
    const { jszip, xmlFiles } = parseResult.fileData as DocxFileData;
    const translationMap = new Map(translations.map((t) => [t.id, t.translated]));

    for (const { path: xmlPath } of xmlFiles) {
      const content = await readZipFile(jszip, xmlPath);
      const xmlObj = parseXml(content);
      let segIdx = 0;

      walkNodes(xmlObj, "w:t", (node) => {
        const children = (node as Record<string, unknown>)["w:t"];
        if (Array.isArray(children)) {
          for (const child of children) {
            const c = child as Record<string, unknown>;
            if (c["#text"] !== undefined) {
              const text = String(c["#text"]);
              if (text.trim().length > 0) {
                const id = `docx-${xmlPath}-${segIdx++}`;
                const translated = translationMap.get(id);
                if (translated) {
                  c["#text"] = translated;
                }
              }
            }
          }
        }
      });

      // Remap fonts for target language
      remapDocxFonts(xmlObj, targetLang);

      await writeZipFile(jszip, xmlPath, buildXml(xmlObj));
    }

    return zip(jszip);
  }
}
