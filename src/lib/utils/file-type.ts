import { SUPPORTED_EXTENSIONS, type SupportedExtension } from "../constants";

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

export function isSupportedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export function getFileType(filename: string): SupportedExtension | null {
  const ext = getFileExtension(filename);
  if ((SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext as SupportedExtension;
  }
  return null;
}

export function getOutputFilename(originalName: string, targetLang: string): string {
  const lastDot = originalName.lastIndexOf(".");
  if (lastDot === -1) return `${originalName}_${targetLang}`;
  const name = originalName.slice(0, lastDot);
  const ext = originalName.slice(lastDot);
  return `${name}_${targetLang}${ext}`;
}
