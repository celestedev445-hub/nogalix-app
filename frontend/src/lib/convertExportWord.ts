import type { EditablePdfDocument, EditablePdfSpan } from "@/lib/editablePdf";
import { zipStore } from "@/lib/convertZip";

type WordSpan = EditablePdfSpan & {
  textDecoration?: string;
  backgroundColor?: string;
};

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorToHex(color: string) {
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) return hex[1].toUpperCase();
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return "000000";
  return [rgb[1], rgb[2], rgb[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function fontName(family: string) {
  const first = family.split(",")[0]?.replace(/["']/g, "").trim();
  return first || "Calibri";
}

function isBold(weight: string) {
  const numeric = Number.parseInt(weight, 10);
  return weight === "bold" || (Number.isFinite(numeric) && numeric >= 600);
}

function pxToEmu(px: number) {
  return Math.max(1, Math.round((px / 96) * 914400));
}

function pxToTwip(px: number) {
  return Math.max(1, Math.round((px / 96) * 1440));
}

function pxToPt(px: number) {
  return Math.max(0.1, Math.round(px * 0.75 * 100) / 100);
}

function groupLines(spans: WordSpan[]) {
  const sorted = spans
    .filter((span) => span.text)
    .sort((left, right) => left.top - right.top || left.left - right.left);
  const lines: WordSpan[][] = [];

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

function gapSpace(span: WordSpan, previous?: WordSpan) {
  if (!previous) return "";
  const gap = span.left - (previous.left + previous.width);
  return gap > Math.max(span.fontSize, previous.fontSize) * 0.28 ? " " : "";
}

function textXml(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((part, index) => {
      const text = `<w:t xml:space="preserve">${xmlEscape(part)}</w:t>`;
      return index === 0 ? text : `<w:br/>${text}`;
    })
    .join("");
}

function runXml(span: WordSpan, previous?: WordSpan) {
  const text = `${gapSpace(span, previous)}${span.text}`;
  const size = Math.max(16, Math.round(span.fontSize * 1.5));
  const family = xmlEscape(fontName(span.fontFamily));
  const bold = isBold(span.fontWeight) ? "<w:b/><w:bCs/>" : "";
  const italic = span.fontStyle === "italic" ? "<w:i/><w:iCs/>" : "";
  const underline = span.textDecoration?.includes("underline") ? '<w:u w:val="single"/>' : "";
  const strike = span.textDecoration?.includes("line-through") ? "<w:strike/>" : "";
  const fill =
    span.backgroundColor && span.backgroundColor !== "transparent"
      ? `<w:shd w:val="clear" w:fill="${colorToHex(span.backgroundColor)}"/>`
      : "";
  return `<w:r><w:rPr><w:rFonts w:ascii="${family}" w:hAnsi="${family}" w:cs="${family}" w:eastAsia="${family}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${colorToHex(span.color)}"/>${bold}${italic}${underline}${strike}${fill}</w:rPr>${textXml(text)}</w:r>`;
}

function decodeDataUrl(url: string) {
  const match = url.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!match) return null;
  const raw = atob(match[2]);
  const data = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    data[index] = raw.charCodeAt(index);
  }
  return {
    ext: match[1].toLowerCase().startsWith("png") ? "png" : "jpg",
    data,
  } as const;
}

function pageSizeXml(widthPx: number, heightPx: number) {
  return `<w:pgSz w:w="${pxToTwip(widthPx)}" w:h="${pxToTwip(heightPx)}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/><w:pgBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:pgBorders>`;
}

function pictureXml(relId: string, widthPx: number, heightPx: number, docId: number) {
  const cx = pxToEmu(widthPx);
  const cy = pxToEmu(heightPx);
  return `<w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${docId}" name="Fond ${docId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docId}" name="background-${docId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`;
}

function lineBox(spans: WordSpan[]) {
  const left = Math.min(...spans.map((span) => span.left));
  const tops = spans.map((span) => span.top - span.ascent * span.fontSize);
  const top = Math.min(...tops);
  const right = Math.max(...spans.map((span) => span.left + Math.max(span.width, span.fontSize * 0.4)));
  const bottom = Math.max(
    ...spans.map((span) => span.top - span.ascent * span.fontSize + Math.max(span.height, span.fontSize * 1.25)),
  );
  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    width: Math.max(spanWidthFallback(spans), right - left + 3),
    height: Math.max(spans[0].fontSize * 1.2, bottom - top + 1),
    rotate: spans[0].rotate,
  };
}

function spanWidthFallback(spans: WordSpan[]) {
  return spans.reduce((sum, span) => sum + Math.max(span.width, span.fontSize * 0.35), 0);
}

function textboxContent(spans: WordSpan[]) {
  const runs = spans.map((span, index) => runXml(span, spans[index - 1])).join("");
  return `<w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="0" w:right="0"/></w:pPr>${runs}</w:p></w:txbxContent>`;
}

function textboxXml(spans: WordSpan[], docId: number) {
  const box = lineBox(spans);
  const cx = pxToEmu(box.width);
  const cy = pxToEmu(box.height);
  const x = pxToEmu(box.left);
  const y = pxToEmu(box.top);
  const rot = Math.abs(box.rotate) > 0.2 ? Math.round(box.rotate * 60000) : 0;
  const content = textboxContent(spans);
  const leftPt = pxToPt(box.left);
  const topPt = pxToPt(box.top);
  const widthPt = pxToPt(box.width);
  const heightPt = pxToPt(box.height);

  return `<mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${250 + docId}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${docId}" name="Texte ${docId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm rot="${rot}"><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx>${content}</wps:txbx><wps:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" upright="1"/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:rect filled="f" stroked="f" style="position:absolute;margin-left:${leftPt}pt;margin-top:${topPt}pt;width:${widthPt}pt;height:${heightPt}pt;z-index:${docId};mso-position-horizontal-relative:page;mso-position-vertical-relative:page;mso-width-relative:page;mso-height-relative:page"><v:textbox inset="0,0,0,0">${content}</v:textbox></v:rect></w:pict></mc:Fallback></mc:AlternateContent>`;
}

function drawingParagraph(drawing: string, sectionXml = "") {
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:ind w:left="0" w:right="0"/>${sectionXml}</w:pPr><w:r>${drawing}</w:r></w:p>`;
}

/** DOCX fidèle façon iLovePDF : fond visuel + texte dans des zones éditables. */
export function buildFaithfulDocx(doc: EditablePdfDocument) {
  const text = new TextEncoder();
  const images: { name: string; data: Uint8Array; relId: string }[] = [];
  const blocks: string[] = [];
  let docId = 1;
  let relIndex = 2;

  const first = doc.pages[0];
  const sameSize = doc.pages.every(
    (page) => Math.abs(page.width - first.width) < 2 && Math.abs(page.height - first.height) < 2,
  );

  doc.pages.forEach((page, pageIndex) => {
    const lastPage = pageIndex === doc.pages.length - 1;
    const decoded = page.background ? decodeDataUrl(page.background) : null;
    if (decoded) {
      const relId = `rId${relIndex}`;
      relIndex += 1;
      images.push({
        name: `word/media/page-${pageIndex + 1}.${decoded.ext}`,
        data: decoded.data,
        relId,
      });
      blocks.push(drawingParagraph(pictureXml(relId, page.width, page.height, docId)));
      docId += 1;
    }

    const lines = groupLines(page.spans);
    if (!lines.length) {
      const section =
        lastPage || sameSize
          ? ""
          : `<w:sectPr><w:type w:val="nextPage"/>${pageSizeXml(page.width, page.height)}</w:sectPr>`;
      blocks.push(`<w:p><w:pPr>${section}</w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`);
    } else {
      lines.forEach((line, lineIndex) => {
        const lastLine = lineIndex === lines.length - 1;
        const section =
          lastLine && !lastPage && !sameSize
            ? `<w:sectPr><w:type w:val="nextPage"/>${pageSizeXml(page.width, page.height)}</w:sectPr>`
            : "";
        blocks.push(drawingParagraph(textboxXml(line, docId), section));
        docId += 1;
      });
    }

    if (!lastPage && sameSize) {
      blocks.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    }
  });

  if (!blocks.length) {
    blocks.push("<w:p><w:r><w:t>Aucun texte extractible.</w:t></w:r></w:p>");
  }

  const last = doc.pages[doc.pages.length - 1];
  const sect = last
    ? `<w:sectPr>${pageSizeXml(last.width, last.height)}</w:sectPr>`
    : `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" mc:Ignorable="w14 w15 wp14"><w:body>${blocks.join("")}${sect}</w:body></w:document>`;

  const imageRels = images
    .map(
      (image) =>
        `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${image.name.replace("word/", "")}"/>`,
    )
    .join("");

  const defaults = images.some((image) => image.name.endsWith(".png"))
    ? '<Default Extension="png" ContentType="image/png"/>'
    : "";
  const jpegDefault = images.some((image) => image.name.endsWith(".jpg"))
    ? '<Default Extension="jpg" ContentType="image/jpeg"/>'
    : "";

  return zipStore([
    {
      name: "[Content_Types].xml",
      data: text.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${defaults}${jpegDefault}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
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
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${imageRels}</Relationships>`,
      ),
    },
    {
      name: "word/styles.xml",
      data: text.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:style></w:styles>',
      ),
    },
    { name: "word/document.xml", data: text.encode(documentXml) },
    ...images.map((image) => ({ name: image.name, data: image.data })),
  ]);
}
