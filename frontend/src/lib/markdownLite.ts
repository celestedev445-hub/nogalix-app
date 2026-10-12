/**
 * Markdown minimal (titres, gras/italique, listes, tableaux, paragraphes) pour le texte
 * extrait des images : aperçu, copie riche, export .txt / .md / .docx.
 */

export type InlineRun = { text: string; bold?: boolean; italic?: boolean };

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; runs: InlineRun[] }
  | { type: "paragraph"; lines: InlineRun[][] }
  | { type: "list"; ordered: boolean; items: InlineRun[][] }
  | { type: "table"; header: InlineRun[][]; rows: InlineRun[][][] }
  | { type: "rule" };

export function parseInline(source: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const pattern = /(\*\*\*|___)(.+?)\1|(\*\*|__)(.+?)\3|(\*|_)(?!\s)(.+?)\5/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (match.index > last) runs.push({ text: source.slice(last, match.index) });
    if (match[2] !== undefined) runs.push({ text: match[2], bold: true, italic: true });
    else if (match[4] !== undefined) runs.push({ text: match[4], bold: true });
    else runs.push({ text: match[6], italic: true });
    last = pattern.lastIndex;
  }
  if (last < source.length) runs.push({ text: source.slice(last) });
  return runs.map((run) => ({ ...run, text: run.text.replace(/\\([*_#|\\-])/g, "$1") }));
}

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const isTableSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function parseMarkdown(markdown: string): MdBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4) as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, runs: parseInline(heading[2].trim()) });
      i += 1;
      continue;
    }
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line).map(parseInline);
      const rows: InlineRun[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]).map(parseInline));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const bullet = /^\s*[-*+•]\s+(.*)$/;
    const ordered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line) && !bullet.test(line);
      const re = isOrdered ? ordered : bullet;
      const items: InlineRun[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(parseInline((re.exec(lines[i]) as RegExpExecArray)[1].trim()));
        i += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    const para: InlineRun[][] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !ordered.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) {
      para.push(parseInline(lines[i].trim()));
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: para });
  }
  return blocks;
}

const runsText = (runs: InlineRun[]) => runs.map((r) => r.text).join("");

/** Texte brut lisible : titres, puces, tableaux alignés par tabulations. */
export function toPlainText(blocks: MdBlock[]) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return runsText(block.runs);
        case "paragraph":
          return block.lines.map(runsText).join("\n");
        case "list":
          return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : "•"} ${runsText(item)}`).join("\n");
        case "table":
          return [block.header, ...block.rows].map((row) => row.map(runsText).join("\t")).join("\n");
        case "rule":
          return "————";
      }
    })
    .join("\n\n");
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runsHtml(runs: InlineRun[]) {
  return runs
    .map((r) => {
      let html = escapeHtml(r.text);
      if (r.italic) html = `<em>${html}</em>`;
      if (r.bold) html = `<strong>${html}</strong>`;
      return html;
    })
    .join("");
}

/** HTML pour le presse-papiers : collé dans Word ou Google Docs, la mise en forme suit. */
export function toHtml(blocks: MdBlock[]) {
  const cell = "border:1px solid #CBD5E1;padding:4px 8px;";
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${runsHtml(block.runs)}</h${block.level}>`;
        case "paragraph":
          return `<p>${block.lines.map(runsHtml).join("<br>")}</p>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          return `<${tag}>${block.items.map((item) => `<li>${runsHtml(item)}</li>`).join("")}</${tag}>`;
        }
        case "table":
          return `<table style="border-collapse:collapse"><thead><tr>${block.header
            .map((c) => `<th style="${cell}">${runsHtml(c)}</th>`)
            .join("")}</tr></thead><tbody>${block.rows
            .map((row) => `<tr>${row.map((c) => `<td style="${cell}">${runsHtml(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`;
        case "rule":
          return "<hr>";
      }
    })
    .join("\n");
}

export async function toDocxBlob(blocks: MdBlock[]): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docx;
  const runs = (items: InlineRun[], extra: { bold?: boolean } = {}) =>
    items.map((r) => new TextRun({ text: r.text, bold: r.bold || extra.bold, italics: r.italic }));
  const headings = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  for (const block of blocks) {
    if (block.type === "heading") {
      children.push(new Paragraph({ heading: headings[block.level - 1], children: runs(block.runs) }));
    } else if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: block.lines.flatMap((line, i) => [
            ...(i > 0 ? [new TextRun({ text: "", break: 1 })] : []),
            ...runs(line),
          ]),
        }),
      );
    } else if (block.type === "list") {
      block.items.forEach((item, i) => {
        children.push(
          new Paragraph({
            indent: { left: 360, hanging: 260 },
            children: [new TextRun({ text: block.ordered ? `${i + 1}.\t` : "•\t" }), ...runs(item)],
          }),
        );
      });
    } else if (block.type === "table") {
      const width = Math.max(block.header.length, ...block.rows.map((r) => r.length), 1);
      const row = (cells: InlineRun[][], header: boolean) =>
        new TableRow({
          tableHeader: header,
          children: Array.from({ length: width }, (_, i) =>
            new TableCell({
              width: { size: Math.floor(100 / width), type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: runs(cells[i] ?? [], { bold: header }) })],
            }),
          ),
        });
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [row(block.header, true), ...block.rows.map((r) => row(r, false))],
        }),
      );
      children.push(new Paragraph({ children: [] }));
    } else {
      children.push(new Paragraph({ thematicBreak: true, children: [] }));
    }
  }
  const document = new Document({ sections: [{ children }] });
  return Packer.toBlob(document);
}
