import type { EditablePdfDocument, EditablePdfSpan } from "@/lib/editablePdf";
import type { PdfTextEdit } from "@/lib/importEditedContent";
import { zipStore } from "@/lib/convertZip";
import { buildFaithfulDocx } from "@/lib/convertExportWord";

type ExportSpan = EditablePdfSpan & {
  textDecoration?: string;
  backgroundColor?: string;
};

export type ConvertExportFormat = "pdf" | "word" | "png" | "txt" | "original";

async function waitForRender() {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 160));
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPages(root: HTMLElement) {
  const reconstructed = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
  if (reconstructed.length) return Array.from(reconstructed);
  const wordPages = root.querySelectorAll<HTMLElement>(".docx-wrapper > section");
  if (wordPages.length) return Array.from(wordPages);
  const wrapper = root.querySelector<HTMLElement>(".docx-wrapper");
  if (wrapper) return [wrapper];
  const cvPages = root.querySelectorAll<HTMLElement>("[data-cv-page]");
  if (cvPages.length) return Array.from(cvPages);
  const papers = root.querySelectorAll<HTMLElement>(".cv-a4");
  if (papers.length) return Array.from(papers);
  return [root];
}

export function captureRoot(root: HTMLElement) {
  return root.querySelector<HTMLElement>("[data-import-export-root]") ?? root;
}

export async function captureElement(element: HTMLElement, scale = 2) {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const previousShadow = element.style.boxShadow;
  const previousOverflow = element.style.overflow;
  element.style.boxShadow = "none";
  element.style.overflow = "hidden";
  await waitForRender();
  try {
    const html2canvas = (await import("html2canvas")).default;
    return await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    element.style.boxShadow = previousShadow;
    element.style.overflow = previousOverflow;
  }
}

export function withExtension(fileName: string, extension: "pdf" | "docx" | "doc" | "png" | "txt") {
  const stem = fileName.replace(/\.[^.]+$/, "") || "document";
  return `${stem}.${extension}`;
}

export function downloadOriginalFile(file: File) {
  downloadBlob(file, file.name);
}

function groupLines(spans: ExportSpan[]) {
  const sorted = spans
    .filter((span) => span.text)
    .sort((left, right) => left.top - right.top || left.left - right.left);
  const lines: ExportSpan[][] = [];

  for (const span of sorted) {
    const current = lines[lines.length - 1];
    if (!current) {
      lines.push([span]);
      continue;
    }
    const reference = current[0];
    const threshold = Math.max(reference.fontSize, span.fontSize) * 0.55;
    if (Math.abs(span.top - reference.top) <= threshold) current.push(span);
    else lines.push([span]);
  }

  for (const line of lines) line.sort((left, right) => left.left - right.left);
  return lines;
}

function gapSpace(span: ExportSpan, previous?: ExportSpan) {
  if (!previous) return "";
  const gap = span.left - (previous.left + previous.width);
  return gap > Math.max(span.fontSize, previous.fontSize) * 0.28 ? " " : "";
}

function joinLineText(spans: ExportSpan[]) {
  return spans
    .map((span, index) => `${gapSpace(span, spans[index - 1])}${span.text}`)
    .join("")
    .replace(/\u00a0/g, " ");
}

export function textFromEditablePdf(doc: {
  pages: { spans: ExportSpan[] }[];
}) {
  return doc.pages
    .map((page) =>
      groupLines(page.spans)
        .map((line) => joinLineText(line).trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");
}

export function textFromPreviewRoot(root: HTMLElement) {
  const target = captureRoot(root);
  return (target.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function textFromEditablePreview(root: HTMLElement) {
  const target = captureRoot(root);
  const pages = target.querySelectorAll<HTMLElement>("[data-pdf-page]");
  if (!pages.length) return textFromPreviewRoot(target);
  return Array.from(pages)
    .map((page) => {
      const spans = Array.from(page.querySelectorAll<HTMLElement>("[data-span-id]"));
      if (!spans.length) return (page.textContent ?? "").trim();
      return spans
        .map((node) => (node.textContent ?? "").replace(/\r\n/g, "\n"))
        .join("")
        .trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function parseEditSize(value?: string) {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function hydrateEditableDocument(
  doc: EditablePdfDocument,
  root?: HTMLElement | null,
  edits?: PdfTextEdit[][] | null,
): EditablePdfDocument {
  const editById = new Map<string, PdfTextEdit>();
  edits?.forEach((page) => {
    page.forEach((edit) => editById.set(edit.spanId, edit));
  });

  const liveById = new Map<string, HTMLElement>();
  root?.querySelectorAll<HTMLElement>("[data-span-id]").forEach((node) => {
    const id = node.dataset.spanId;
    if (id) liveById.set(id, node);
  });

  return {
    fonts: doc.fonts,
    pages: doc.pages.map((page) => ({
      ...page,
      spans: page.spans.map((span) => {
        const live = liveById.get(span.id);
        const edit = editById.get(span.id);
        const liveText = live?.textContent?.replace(/\r\n/g, "\n");
        const fontSize = parseEditSize(edit?.fontSize) ?? span.fontSize;
        return {
          ...span,
          text: liveText ?? edit?.text ?? span.text,
          fontSize,
          fontFamily: edit?.fontFamily || span.fontFamily,
          fontWeight: edit?.fontWeight || span.fontWeight,
          fontStyle: edit?.fontStyle || span.fontStyle,
          color: edit?.color || span.color,
          textDecoration: edit?.textDecoration,
          backgroundColor: edit?.backgroundColor,
        };
      }),
    })),
  };
}

export function pickRichestText(...candidates: Array<string | null | undefined>) {
  let best = "";
  for (const item of candidates) {
    const value = item?.trim() ?? "";
    if (value.length > best.length) best = value;
  }
  return best;
}

export function downloadReconstructionAsTxt(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, withExtension(fileName, "txt"));
}

async function canvasToPng(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Impossible de générer l'image PNG."));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function downloadReconstructionAsPng(root: HTMLElement, fileName: string) {
  const target = captureRoot(root);
  const pages = exportPages(target);
  const targets = pages.length ? pages : [target];
  const stem = fileName.replace(/\.[^.]+$/, "") || "document";

  if (targets.length === 1) {
    const canvas = await captureElement(targets[0], 3);
    downloadBlob(new Blob([await canvasToPng(canvas)], { type: "image/png" }), `${stem}.png`);
    return;
  }

  const entries = [{ name: `${stem}/`, data: new Uint8Array() }];
  for (let index = 0; index < targets.length; index += 1) {
    const canvas = await captureElement(targets[index], 3);
    entries.push({
      name: `${stem}/page-${String(index + 1).padStart(2, "0")}.png`,
      data: await canvasToPng(canvas),
    });
  }
  downloadBlob(new Blob([zipStore(entries)], { type: "application/zip" }), `${stem}-pages.zip`);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildJpegPdf(
  pages: { jpeg: Uint8Array; width: number; height: number }[],
  marginMm = 0,
) {
  const text = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets = [0];
  let size = 0;

  function push(data: string | Uint8Array) {
    const bytes = typeof data === "string" ? text.encode(data) : data;
    parts.push(bytes);
    size += bytes.length;
  }

  function startObj() {
    offsets.push(size);
  }

  push("%PDF-1.4\n");

  const count = pages.length;
  const pageObj = (index: number) => 3 + index * 3;
  const contentObj = (index: number) => 4 + index * 3;
  const imageObj = (index: number) => 5 + index * 3;

  startObj();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj();
  const kids = pages.map((_, index) => `${pageObj(index)} 0 R`).join(" ");
  push(`2 0 obj\n<< /Type /Pages /Count ${count} /Kids [${kids}] >>\nendobj\n`);

  for (let index = 0; index < count; index += 1) {
    const page = pages[index];
    const width = Math.max(1, Math.round(page.width));
    const height = Math.max(1, Math.round(page.height));
    const margin = Math.max(0, Math.round(width * (marginMm / 210)));
    const innerW = Math.max(1, width - margin * 2);
    const innerH = Math.max(1, height - margin * 2);

    startObj();
    push(
      `${pageObj(index)} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${index} ${imageObj(index)} 0 R >> >> /Contents ${contentObj(index)} 0 R >>\nendobj\n`,
    );

    const content = `q ${innerW} 0 0 ${innerH} ${margin} ${margin} cm /Im${index} Do Q\n`;
    startObj();
    push(
      `${contentObj(index)} 0 obj\n<< /Length ${text.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`,
    );

    startObj();
    push(
      `${imageObj(index)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.byteLength} >>\nstream\n`,
    );
    push(page.jpeg);
    push("\nendstream\nendobj\n");
  }

  const xrefStart = size;
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let index = 1; index < offsets.length; index += 1) {
    push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);
  return concatBytes(parts);
}

function jpegFromCanvas(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const raw = atob(dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export async function downloadReconstructionAsPdf(
  root: HTMLElement,
  fileName: string,
  options?: { pageMarginMm?: number },
) {
  const target = captureRoot(root);
  const pages = exportPages(target);
  const targets = pages.length ? pages : [target];
  const images = [];

  for (const page of targets) {
    const canvas = await captureElement(page);
    images.push({
      jpeg: jpegFromCanvas(canvas),
      width: canvas.width,
      height: canvas.height,
    });
  }

  const pdf = buildJpegPdf(images, options?.pageMarginMm ?? 0);
  downloadBlob(new Blob([pdf], { type: "application/pdf" }), withExtension(fileName, "pdf"));
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function documentXmlFromPlain(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(
      (line) =>
        `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`,
    );
  const body = paragraphs.length
    ? paragraphs.join("")
    : "<w:p><w:r><w:t>Aucun texte extractible.</w:t></w:r></w:p>";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`;
}

function buildDocx(documentXml: string) {
  const text = new TextEncoder();
  return zipStore([
    {
      name: "[Content_Types].xml",
      data: text.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      ),
    },
    {
      name: "_rels/.rels",
      data: text.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
    },
    {
      name: "word/_rels/document.xml.rels",
      data: text.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ),
    },
    {
      name: "word/styles.xml",
      data: text.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>',
      ),
    },
    { name: "word/document.xml", data: text.encode(documentXml) },
  ]);
}

export function downloadReconstructionAsWord(
  fileName: string,
  doc?: EditablePdfDocument | null,
  plainText = "",
) {
  const bytes = doc?.pages.length ? buildFaithfulDocx(doc) : buildDocx(documentXmlFromPlain(plainText));
  downloadBlob(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    withExtension(fileName, "docx"),
  );
}

export async function exportVisualDocument(
  format: "pdf" | "png",
  root: HTMLElement,
  fileName: string,
  options?: { pageMarginMm?: number },
) {
  if (format === "pdf") {
    await downloadReconstructionAsPdf(root, fileName, options);
    return;
  }
  await downloadReconstructionAsPng(root, fileName);
}

export type DocumentExportKind = "pdf" | "docx" | "text" | "image" | "unsupported";

export type DocumentExportInput = {
  format: ConvertExportFormat;
  fileName: string;
  file?: File | null;
  kind?: DocumentExportKind;
  captureRoot?: HTMLElement | null;
  editableDoc?: EditablePdfDocument | null;
  storedText?: string;
  edits?: PdfTextEdit[][] | null;
};

/** Point d’entrée unique : éditeur importé et page /convertir. */
export async function exportReconstructedDocument(input: DocumentExportInput) {
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const fileName = input.fileName;
  const file = input.file ?? null;
  const kind = input.kind;
  const root = input.captureRoot ?? null;
  const merged = input.editableDoc
    ? hydrateEditableDocument(input.editableDoc, root, input.edits)
    : null;
  const previewText = root ? textFromEditablePreview(root) : "";
  const originalText = kind === "text" && file ? await file.text() : "";
  const fullText = pickRichestText(
    merged ? textFromEditablePdf(merged) : "",
    previewText,
    input.storedText,
    originalText,
  );

  if (input.format === "original") {
    if (!file) throw new Error("Fichier original introuvable.");
    downloadOriginalFile(file);
    return;
  }

  if (input.format === "txt") {
    if (!fullText) throw new Error("Aucun texte extractible.");
    downloadReconstructionAsTxt(fileName, fullText);
    return;
  }

  if (input.format === "word") {
    if (kind === "docx" && file) {
      downloadOriginalFile(file);
      return;
    }
    if (kind === "pdf") {
      if (!file) throw new Error("Fichier PDF introuvable pour la conversion Word.");
      const { convertPdfToDocx } = await import("@/services/convert");
      const docx = await convertPdfToDocx(file);
      downloadOriginalFile(docx);
      return;
    }
    if (merged?.pages.some((page) => page.spans.some((span) => span.text))) {
      downloadReconstructionAsWord(fileName, merged);
      return;
    }
    if (!fullText) throw new Error("Aucun texte extractible.");
    downloadReconstructionAsWord(fileName, null, fullText);
    return;
  }

  if (!root) {
    throw new Error("Aperçu indisponible pour l'export visuel.");
  }

  await exportVisualDocument(input.format, root, fileName);
}
