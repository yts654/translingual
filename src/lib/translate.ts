import { getOpenAIClient } from "./openai";
import type { TextSegment, TranslatedSegment } from "./parsers/types";
import {
  BATCH_SIZE,
  BATCH_CHAR_LIMIT,
  MAX_CONCURRENT_REQUESTS,
  MAX_RETRIES,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "./constants";

interface BatchItem {
  id: string;
  text: string;
}

function createBatches(segments: TextSegment[]): BatchItem[][] {
  const batches: BatchItem[][] = [];
  let current: BatchItem[] = [];
  let charCount = 0;

  for (const seg of segments) {
    if (
      current.length >= BATCH_SIZE ||
      (charCount + seg.text.length > BATCH_CHAR_LIMIT && current.length > 0)
    ) {
      batches.push(current);
      current = [];
      charCount = 0;
    }
    current.push({ id: seg.id, text: seg.text });
    charCount += seg.text.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function translateBatch(
  batch: BatchItem[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<TranslatedSegment[]> {
  const openai = getOpenAIClient();
  const srcName = SUPPORTED_LANGUAGES[sourceLang];
  const tgtName = SUPPORTED_LANGUAGES[targetLang];

  const prompt = `You are a professional document translator. Translate the following text segments from ${srcName} to ${tgtName}.

Rules:
- Translate ONLY the text content, preserving any special characters, numbers, and formatting markers
- Keep proper nouns, brand names, and technical terms as-is when appropriate
- Return a JSON object with a "translations" array containing objects with "id" and "text" fields
- The "id" must match the input id exactly
- Do NOT add any explanation, just return the JSON

Input segments:
${JSON.stringify(batch.map((b) => ({ id: b.id, text: b.text })))}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");

      const parsed = JSON.parse(content) as { translations: { id: string; text: string }[] };
      if (!parsed.translations || !Array.isArray(parsed.translations)) {
        throw new Error("Invalid response format");
      }

      return parsed.translations.map((t) => {
        const original = batch.find((b) => b.id === t.id);
        return {
          id: t.id,
          original: original?.text ?? "",
          translated: t.text,
        };
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError ?? new Error("Translation failed");
}

export async function translateSegments(
  segments: TextSegment[],
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  onProgress?: (translated: number, total: number) => void
): Promise<TranslatedSegment[]> {
  // Filter out empty segments
  const nonEmpty = segments.filter((s) => s.text.trim().length > 0);
  if (nonEmpty.length === 0) return [];

  const batches = createBatches(nonEmpty);
  const results: TranslatedSegment[] = [];
  let completedCount = 0;

  // Process batches with concurrency limit
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_REQUESTS) {
    const chunk = batches.slice(i, i + MAX_CONCURRENT_REQUESTS);
    const chunkResults = await Promise.all(
      chunk.map((batch) => translateBatch(batch, sourceLang, targetLang))
    );
    for (const r of chunkResults) {
      results.push(...r);
      completedCount += r.length;
      onProgress?.(completedCount, nonEmpty.length);
    }
  }

  return results;
}
