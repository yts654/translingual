import { FONT_MAP, type LanguageCode } from "../constants";
import { walkNodes } from "./xml-helpers";

type FileType = "docx" | "pptx" | "xlsx";

function getFontName(targetLang: LanguageCode, fileType: FileType): string {
  return FONT_MAP[targetLang][fileType];
}

// DOCX: Change fonts in w:rPr (run properties)
export function remapDocxFonts(xmlObj: unknown[], targetLang: LanguageCode): void {
  const fontName = getFontName(targetLang, "docx");

  walkNodes(xmlObj, "w:rFonts", (node) => {
    const attrs = (node as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
    if (attrs) {
      if (attrs["@_w:ascii"]) attrs["@_w:ascii"] = fontName;
      if (attrs["@_w:hAnsi"]) attrs["@_w:hAnsi"] = fontName;
      if (attrs["@_w:eastAsia"]) attrs["@_w:eastAsia"] = fontName;
      if (attrs["@_w:cs"]) attrs["@_w:cs"] = fontName;
    }
  });
}

// PPTX: Change fonts in a:latin, a:ea, a:cs
export function remapPptxFonts(xmlObj: unknown[], targetLang: LanguageCode): void {
  const fontName = getFontName(targetLang, "pptx");

  for (const tag of ["a:latin", "a:ea", "a:cs"]) {
    walkNodes(xmlObj, tag, (node) => {
      const attrs = (node as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
      if (attrs && attrs["@_typeface"]) {
        attrs["@_typeface"] = fontName;
      }
    });
  }
}

// XLSX: Change fonts in the styles
export function remapXlsxFonts(xmlObj: unknown[], targetLang: LanguageCode): void {
  const fontName = getFontName(targetLang, "xlsx");

  walkNodes(xmlObj, "name", (node) => {
    const attrs = (node as Record<string, unknown>)[":@"] as Record<string, string> | undefined;
    if (attrs && attrs["@_val"]) {
      attrs["@_val"] = fontName;
    }
  });
}
