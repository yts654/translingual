"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { SUPPORTED_EXTENSIONS } from "@/lib/constants";

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT: Record<string, string[]> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "text/markdown": [".md"],
  "application/json": [".json"],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "docx": return "📄";
    case "xlsx": return "📊";
    case "pptx": return "📑";
    case "csv": return "📋";
    case "json": return "🔧";
    case "md": return "📝";
    default: return "📄";
  }
}

export function FileUploadZone({ file, onFileSelect, disabled }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    disabled,
  });

  if (file) {
    return (
      <div className="border-2 border-[var(--border)] rounded-xl p-6 bg-[var(--card)]">
        <div className="flex items-center gap-4">
          <span className="text-3xl">{getFileIcon(file.name)}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--foreground)] truncate">{file.name}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{formatFileSize(file.size)}</p>
          </div>
          {!disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null);
              }}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-[var(--muted-foreground)]" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
        isDragActive
          ? "border-[var(--primary)] bg-blue-50 dark:bg-blue-950/20"
          : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      <Upload className="w-10 h-10 mx-auto mb-4 text-[var(--muted-foreground)]" />
      {isDragActive ? (
        <p className="text-[var(--primary)] font-medium">ドロップしてアップロード</p>
      ) : (
        <>
          <p className="font-medium text-[var(--foreground)] mb-1">
            ファイルをドラッグ＆ドロップ
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            またはクリックしてファイルを選択
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            対応形式: {SUPPORTED_EXTENSIONS.join(", ")}
          </p>
        </>
      )}
    </div>
  );
}
