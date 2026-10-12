import type { CvData } from "@/lib/cvTypes";
import { PAGE_H, PAGE_W, fullName } from "@/components/templates/shared";
import { formatCvPeriod } from "@/lib/formatDate";

export type CvExportFormat = "pdf" | "word" | "png";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function cvExportBaseName(cv: CvData) {
  const fromName = fullName(cv)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const fromTitle = cv.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return fromTitle || fromName || "CV";
}

async function waitForRender() {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => window.setTimeout(resolve, 120));
}

export async function captureCvElement(root: HTMLElement) {
  await waitForRender();
  const target = root.querySelector<HTMLElement>(".cv-a4") ?? root;
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: PAGE_W,
    height: PAGE_H,
    logging: false,
  });
}

export async function exportCvAsPdf(root: HTMLElement, cv: CvData) {
  const canvas = await captureCvElement(root);
  const { jsPDF } = await import("jspdf");
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [PAGE_W, PAGE_H],
  });
  const margin = Math.round(PAGE_W * (12 / 210));
  pdf.addImage(
    imgData,
    "PNG",
    margin,
    margin,
    PAGE_W - margin * 2,
    PAGE_H - margin * 2,
    undefined,
    "FAST",
  );
  pdf.save(`${cvExportBaseName(cv)}.pdf`);
}

export async function exportCvAsPng(root: HTMLElement, cv: CvData) {
  const canvas = await captureCvElement(root);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Impossible de générer l'image PNG."));
    }, "image/png");
  });
  downloadBlob(blob, `${cvExportBaseName(cv)}.png`);
}

export async function exportCvAsWord(cv: CvData) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  const sectionHeading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 120 },
      children: [new TextRun({ text, bold: true, size: 26 })],
    });

  const bodyParagraph = (text: string) =>
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text, size: 22 })],
    });

  const bulletParagraph = (text: string) =>
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: `• ${text}`, size: 22 })],
    });

  const blocks: InstanceType<typeof Paragraph>[] = [];
  const name = fullName(cv);

  blocks.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: name, bold: true, size: 36 })],
    }),
  );

  if (cv.identity.title.trim()) {
    blocks.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: cv.identity.title.trim(), italics: true, size: 24 })],
      }),
    );
  }

  const contacts = [
    cv.identity.email,
    cv.identity.phone,
    cv.identity.location,
    cv.identity.website,
    cv.identity.github,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  if (contacts.length) {
    blocks.push(bodyParagraph(contacts.join(" · ")));
  }

  if (cv.summary.trim()) {
    blocks.push(sectionHeading("Profil"));
    blocks.push(bodyParagraph(cv.summary.trim()));
  }

  if (cv.experiences.length) {
    blocks.push(sectionHeading("Expérience professionnelle"));
    for (const exp of cv.experiences) {
      const period = formatCvPeriod(exp.start, exp.end, exp.current);
      const header = [exp.title, exp.company].filter(Boolean).join(" · ");
      blocks.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({ text: header, bold: true, size: 24 }),
            new TextRun({ text: period ? `  (${period})` : "", size: 22 }),
          ],
        }),
      );
      if (exp.location?.trim()) blocks.push(bodyParagraph(exp.location.trim()));
      for (const bullet of exp.bullets.filter(Boolean)) {
        blocks.push(bulletParagraph(bullet));
      }
    }
  }

  if (cv.education.length) {
    blocks.push(sectionHeading("Formation"));
    for (const edu of cv.education) {
      blocks.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: edu.diploma, bold: true, size: 24 }),
            new TextRun({ text: edu.year ? `  (${edu.year})` : "", size: 22 }),
          ],
        }),
      );
      blocks.push(bodyParagraph(edu.school));
      if (edu.details?.trim()) blocks.push(bodyParagraph(edu.details.trim()));
    }
  }

  if (cv.skills.length) {
    blocks.push(sectionHeading("Compétences"));
    blocks.push(
      bodyParagraph(cv.skills.map((skill) => skill.name).filter(Boolean).join(", ")),
    );
  }

  if (cv.projects.length) {
    blocks.push(sectionHeading("Projets"));
    for (const project of cv.projects) {
      blocks.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: project.name, bold: true, size: 24 })],
        }),
      );
      if (project.description.trim()) blocks.push(bodyParagraph(project.description.trim()));
      if (project.url?.trim()) blocks.push(bodyParagraph(project.url.trim()));
    }
  }

  if (cv.certifications.length) {
    blocks.push(sectionHeading("Certifications"));
    for (const cert of cv.certifications) {
      blocks.push(
        bodyParagraph(`${cert.name}${cert.issuer ? ` · ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`),
      );
    }
  }

  if ((cv.references ?? []).length) {
    blocks.push(sectionHeading("Références"));
    for (const item of cv.references ?? []) {
      const line = [item.role, item.company, item.phone, item.email].filter(Boolean).join(" · ");
      blocks.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [new TextRun({ text: item.name, bold: true, size: 24 })],
        }),
      );
      if (line) blocks.push(bodyParagraph(line));
    }
  }

  if (cv.languages.length) {
    blocks.push(sectionHeading("Langues"));
    blocks.push(
      bodyParagraph(
        cv.languages.map((lang) => `${lang.name}${lang.level ? ` : ${lang.level}` : ""}`).join(" · "),
      ),
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children: blocks }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${cvExportBaseName(cv)}.docx`);
}

export async function exportCv(
  format: CvExportFormat,
  cv: CvData,
  captureRoot: HTMLElement,
) {
  if (format === "word") {
    await exportCvAsWord(cv);
    return;
  }
  const { exportVisualDocument } = await import("@/lib/convertExport");
  await exportVisualDocument(format, captureRoot, cvExportBaseName(cv), {
    pageMarginMm: format === "pdf" ? 12 : 0,
  });
}
