"use client";

import { ArrowRightLeft } from "lucide-react";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/constants";

interface LanguageSelectorProps {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  onSourceChange: (lang: LanguageCode) => void;
  onTargetChange: (lang: LanguageCode) => void;
  disabled?: boolean;
}

const languages = Object.entries(SUPPORTED_LANGUAGES) as [LanguageCode, string][];

export function LanguageSelector({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  disabled,
}: LanguageSelectorProps) {
  const handleSwap = () => {
    onSourceChange(targetLang);
    onTargetChange(sourceLang);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">
          翻訳元
        </label>
        <select
          value={sourceLang}
          onChange={(e) => onSourceChange(e.target.value as LanguageCode)}
          disabled={disabled}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
        >
          {languages.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSwap}
        disabled={disabled}
        className="mt-6 p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
        aria-label="Swap languages"
      >
        <ArrowRightLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
      </button>

      <div className="flex-1">
        <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">
          翻訳先
        </label>
        <select
          value={targetLang}
          onChange={(e) => onTargetChange(e.target.value as LanguageCode)}
          disabled={disabled}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
        >
          {languages.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
