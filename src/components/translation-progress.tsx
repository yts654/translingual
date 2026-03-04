"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { TranslationProgress as ProgressType } from "@/lib/parsers/types";

interface TranslationProgressProps {
  progress: ProgressType;
}

const STATUS_LABELS: Record<ProgressType["status"], string> = {
  uploading: "アップロード中...",
  parsing: "ファイルを解析中...",
  translating: "翻訳中...",
  reconstructing: "ファイルを再構築中...",
  done: "翻訳完了！",
  error: "エラーが発生しました",
};

export function TranslationProgress({ progress }: TranslationProgressProps) {
  const isDone = progress.status === "done";
  const isError = progress.status === "error";

  return (
    <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]">
      <div className="flex items-center gap-3 mb-4">
        {isError ? (
          <AlertCircle className="w-5 h-5 text-[var(--destructive)]" />
        ) : isDone ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
        )}
        <span
          className={`font-medium ${
            isError
              ? "text-[var(--destructive)]"
              : isDone
                ? "text-green-500"
                : "text-[var(--foreground)]"
          }`}
        >
          {STATUS_LABELS[progress.status]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[var(--muted)] rounded-full h-2.5 mb-3">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            isError ? "bg-[var(--destructive)]" : isDone ? "bg-green-500" : "bg-[var(--primary)]"
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
        <span>{progress.message}</span>
        {progress.translatedCount !== undefined && progress.totalCount !== undefined && (
          <span>
            {progress.translatedCount} / {progress.totalCount} セグメント
          </span>
        )}
      </div>
    </div>
  );
}
