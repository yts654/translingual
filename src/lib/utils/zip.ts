import JSZip from "jszip";

export async function unzip(buffer: ArrayBuffer): Promise<JSZip> {
  return JSZip.loadAsync(buffer);
}

export async function zip(jszip: JSZip): Promise<ArrayBuffer> {
  return jszip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function readZipFile(jszip: JSZip, path: string): Promise<string> {
  const file = jszip.file(path);
  if (!file) throw new Error(`File not found in archive: ${path}`);
  return file.async("string");
}

export async function writeZipFile(jszip: JSZip, path: string, content: string): Promise<void> {
  jszip.file(path, content);
}
