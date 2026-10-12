import { makeRequest } from "@/lib/makeRequest";
import type { EditablePdfDocument } from "@/lib/editablePdf";
import { isEditablePdfDocument } from "@/lib/editablePdf";

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function convertPdfToEditable(file: File): Promise<EditablePdfDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await makeRequest("convert/pdf-to-editable", "POST", formData, false, false);
  if (!isEditablePdfDocument(response)) {
    throw new Error("La conversion du PDF a renvoyé un document invalide.");
  }
  if (!response.pages.length) {
    throw new Error("Ce PDF ne contient aucune page.");
  }
  return response;
}

export async function convertPdfToDocx(file: File): Promise<File> {
  const formData = new FormData();
  formData.append("file", file);

  const response = (await makeRequest("convert/pdf-to-docx", "POST", formData, false, false)) as {
    fileName: string;
    contentBase64: string;
    mimeType: string;
  };

  if (!response?.contentBase64) {
    throw new Error("La conversion Word n'a renvoyé aucun fichier.");
  }

  const bytes = base64ToUint8Array(response.contentBase64);
  const type =
    response.mimeType ||
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new File([bytes], response.fileName || file.name.replace(/\.pdf$/i, ".docx"), { type });
}
