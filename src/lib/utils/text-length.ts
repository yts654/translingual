import { CJK_CHAR_WIDTH, LATIN_CHAR_WIDTH } from "../constants";

const CJK_RANGES = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/;

export function estimateTextWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += CJK_RANGES.test(char) ? CJK_CHAR_WIDTH : LATIN_CHAR_WIDTH;
  }
  return width;
}

export function getTextLengthRatio(original: string, translated: string): number {
  const origWidth = estimateTextWidth(original);
  if (origWidth === 0) return 1;
  return estimateTextWidth(translated) / origWidth;
}
