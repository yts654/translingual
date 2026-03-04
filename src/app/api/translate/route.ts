import { NextRequest, NextResponse } from "next/server";
import { getFileType } from "@/lib/utils/file-type";
import { translateSegments } from "@/lib/translate";
import { DocxParser } from "@/lib/parsers/docx-parser";
import { XlsxParser } from "@/lib/parsers/xlsx-parser";
import { PptxParser } from "@/lib/parsers/pptx-parser";
import { TxtParser } from "@/lib/parsers/txt-parser";
import { CsvParser } from "@/lib/parsers/csv-parser";
import { MdParser } from "@/lib/parsers/md-parser";
import { JsonParser } from "@/lib/parsers/json-parser";
import type { FileParser } from "@/lib/parsers/types";
import type { LanguageCode } from "@/lib/constants";

function getParser(ext: string): FileParser {
  switch (ext) {
    case ".docx": return new DocxParser();
    case ".xlsx": return new XlsxParser();
    case ".pptx": return new PptxParser();
    case ".txt":  return new TxtParser();
    case ".csv":  return new CsvParser();
    case ".md":   return new MdParser();
    case ".json": return new JsonParser();
    default: throw new Error(`Unsupported file type: ${ext}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sourceLang = formData.get("sourceLang") as LanguageCode | null;
    const targetLang = formData.get("targetLang") as LanguageCode | null;

    if (!file || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: "Missing required fields: file, sourceLang, targetLang" },
        { status: 400 }
      );
    }

    if (sourceLang === targetLang) {
      return NextResponse.json(
        { error: "Source and target languages must be different" },
        { status: 400 }
      );
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: .docx, .xlsx, .pptx, .txt, .csv, .md, .json` },
        { status: 400 }
      );
    }

    const parser = getParser(fileType);
    const buffer = await file.arrayBuffer();

    // Parse the file
    const parseResult = await parser.parse(buffer);

    if (parseResult.segments.length === 0) {
      return NextResponse.json(
        { error: "No translatable text found in the file" },
        { status: 400 }
      );
    }

    // Translate
    const translations = await translateSegments(
      parseResult.segments,
      sourceLang,
      targetLang
    );

    // Reconstruct
    const outputBuffer = await parser.reconstruct(parseResult, translations, targetLang);

    // Return the file
    const outputBytes = new Uint8Array(outputBuffer);
    return new NextResponse(outputBytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "X-Segment-Count": String(parseResult.segments.length),
        "X-Translated-Count": String(translations.length),
      },
    });
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
