"use client";

import { useState, useCallback } from "react";
import { Languages, Zap } from "lucide-react";
import { FileUploadZone } from "@/components/file-upload-zone";
import { LanguageSelector } from "@/components/language-selector";
import { TranslationProgress } from "@/components/translation-progress";
import { DownloadButton } from "@/components/download-button";
import { getOutputFilename } from "@/lib/utils/file-type";
import type { LanguageCode } from "@/lib/constants";
import type { TranslationProgress as ProgressType } from "@/lib/parsers/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState<LanguageCode>("ja");
  const [targetLang, setTargetLang] = useState<LanguageCode>("en");
  const [progress, setProgress] = useState<ProgressType | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputFilename, setOutputFilename] = useState("");

  const isTranslating =
    progress !== null && progress.status !== "done" && progress.status !== "error";

  const handleTranslate = useCallback(async () => {
    if (!file || sourceLang === targetLang) return;

    setResultBlob(null);
    setProgress({
      status: "uploading",
      progress: 5,
      message: "ファイルをアップロード中...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceLang", sourceLang);
      formData.append("targetLang", targetLang);

      setProgress({
        status: "translating",
        progress: 20,
        message: "翻訳処理中... しばらくお待ちください",
      });

      const response = await fetch("/api/translate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "翻訳に失敗しました";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `サーバーエラー (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const segCount = response.headers.get("X-Segment-Count");
      const transCount = response.headers.get("X-Translated-Count");

      setProgress({
        status: "reconstructing",
        progress: 90,
        message: "ファイルを生成中...",
        translatedCount: transCount ? parseInt(transCount) : undefined,
        totalCount: segCount ? parseInt(segCount) : undefined,
      });

      const blob = await response.blob();
      const outName = getOutputFilename(file.name, targetLang);
      setResultBlob(blob);
      setOutputFilename(outName);

      setProgress({
        status: "done",
        progress: 100,
        message: `${transCount || ""}セグメントの翻訳が完了しました`,
        translatedCount: transCount ? parseInt(transCount) : undefined,
        totalCount: segCount ? parseInt(segCount) : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "翻訳に失敗しました";
      setProgress({
        status: "error",
        progress: 0,
        message,
      });
    }
  }, [file, sourceLang, targetLang]);

  const handleReset = () => {
    setFile(null);
    setProgress(null);
    setResultBlob(null);
    setOutputFilename("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Languages className="w-8 h-8 text-[var(--primary)]" />
            <h1 className="text-3xl font-bold text-[var(--foreground)]">TransLingual</h1>
          </div>
          <p className="text-[var(--muted-foreground)]">
            フォーマットを保持した多言語ドキュメント翻訳
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-[var(--muted-foreground)]">
            <Zap className="w-3 h-3" />
            <span>GPT-4o搭載 &bull; 書式完全保持</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-6 space-y-6">
          {/* Language Selection */}
          <LanguageSelector
            sourceLang={sourceLang}
            targetLang={targetLang}
            onSourceChange={setSourceLang}
            onTargetChange={setTargetLang}
            disabled={isTranslating}
          />

          {/* File Upload */}
          <FileUploadZone
            file={file}
            onFileSelect={setFile}
            disabled={isTranslating}
          />

          {/* Translate Button */}
          {file && !isTranslating && progress?.status !== "done" && (
            <button
              onClick={handleTranslate}
              disabled={sourceLang === targetLang}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Languages className="w-5 h-5" />
              翻訳を開始
            </button>
          )}

          {/* Validation Warning */}
          {sourceLang === targetLang && file && (
            <p className="text-sm text-amber-500 text-center">
              翻訳元と翻訳先の言語が同じです。異なる言語を選択してください。
            </p>
          )}

          {/* Progress */}
          {progress && <TranslationProgress progress={progress} />}

          {/* Download */}
          {progress?.status === "done" && resultBlob && (
            <>
              <DownloadButton blob={resultBlob} filename={outputFilename} />
              <button
                onClick={handleReset}
                className="w-full px-6 py-2.5 rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] font-medium transition-colors"
              >
                別のファイルを翻訳
              </button>
            </>
          )}

          {/* Error retry */}
          {progress?.status === "error" && (
            <button
              onClick={handleTranslate}
              className="w-full px-6 py-3 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white font-medium transition-all"
            >
              再試行
            </button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-8">
          Word (.docx) &bull; Excel (.xlsx) &bull; PowerPoint (.pptx) &bull; TXT &bull; CSV &bull;
          Markdown &bull; JSON
        </p>
      </div>
    </main>
  );
}
