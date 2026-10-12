export type ConvertKind = "pdf" | "docx";

export type ConvertResponse = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  source: ConvertKind;
  target: ConvertKind;
};

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function oppositeKind(kind: ConvertKind): ConvertKind {
  return kind === "pdf" ? "docx" : "pdf";
}

export function labelForKind(kind: ConvertKind) {
  return kind === "pdf" ? "PDF" : "Word";
}

export type EditFileKind = ConvertKind | "text";

export function isEditFileKind(value: unknown): value is EditFileKind {
  return value === "pdf" || value === "docx" || value === "text";
}

export function labelForEditKind(kind: EditFileKind) {
  if (kind === "text") return "Texte";
  return labelForKind(kind);
}

export async function detectEditKind(file: File): Promise<EditFileKind | "doc" | null> {
  const convert = await detectConvertKind(file);
  if (convert) return convert;
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith("text/") || name.endsWith(".txt")) {
    return "text";
  }
  return null;
}

export function mimeForKind(kind: ConvertKind) {
  return kind === "pdf" ? PDF_MIME : DOCX_MIME;
}

function headerEquals(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

export async function detectConvertKind(file: File): Promise<ConvertKind | "doc" | null> {
  const slice = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(slice);

  if (headerEquals(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (headerEquals(bytes, [0xd0, 0xcf, 0x11, 0xe0])) return "doc";
  if (headerEquals(bytes, [0x50, 0x4b, 0x03, 0x04]) || headerEquals(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    const head = new TextDecoder("latin1").decode(await file.slice(0, 4096).arrayBuffer());
    if (head.includes("word/") || file.name.toLowerCase().endsWith(".docx")) return "docx";
    return null;
  }

  const mime = file.type.toLowerCase();
  if (mime === PDF_MIME) return "pdf";
  if (mime === DOCX_MIME) return "docx";
  if (mime === "application/msword") return "doc";

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  return null;
}

export function isConvertKind(value: unknown): value is ConvertKind {
  return value === "pdf" || value === "docx";
}

export function isConvertResponse(value: unknown): value is ConvertResponse {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.fileName === "string" &&
    row.fileName.length > 0 &&
    typeof row.mimeType === "string" &&
    typeof row.contentBase64 === "string" &&
    row.contentBase64.length > 0 &&
    isConvertKind(row.source) &&
    isConvertKind(row.target)
  );
}

export function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
