import type { EditablePdfPage, EditablePdfSpan } from "@/lib/editablePdf";

/** Word « Normal » : 2,54 cm (1 pouce) à 96 dpi. */
export const WORD_MARGIN_PX = 96;
const MIN_EDGE_PX = 12;
const COLUMN_GAP_PX = 10;
const SAME_LINE_RATIO = 0.7;

export type PageMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function detectPageMargins(page: EditablePdfPage): PageMargins {
  if (!page.spans.length) {
    return {
      left: WORD_MARGIN_PX,
      right: WORD_MARGIN_PX,
      top: WORD_MARGIN_PX,
      bottom: WORD_MARGIN_PX,
    };
  }

  let minLeft = Infinity;
  let maxRight = 0;
  let minTop = Infinity;
  let maxBottom = 0;
  for (const span of page.spans) {
    minLeft = Math.min(minLeft, span.left);
    maxRight = Math.max(maxRight, span.left + span.width);
    minTop = Math.min(minTop, span.top - span.ascent * span.fontSize);
    maxBottom = Math.max(maxBottom, span.top + span.height);
  }

  return {
    left: Math.min(WORD_MARGIN_PX, Math.max(MIN_EDGE_PX, minLeft)),
    right: Math.min(WORD_MARGIN_PX, Math.max(MIN_EDGE_PX, page.width - maxRight)),
    top: Math.min(WORD_MARGIN_PX, Math.max(MIN_EDGE_PX, minTop)),
    bottom: Math.min(WORD_MARGIN_PX, Math.max(MIN_EDGE_PX, page.height - maxBottom)),
  };
}

export function wrapWidthForSpan(
  span: EditablePdfSpan,
  page: EditablePdfPage,
  margins: PageMargins,
): number {
  const original = span.width + Math.max(8, span.fontSize * 0.2);
  if (Math.abs(span.rotate) > 0.2) return original;
  let right = page.width - margins.right;
  const top = span.top - span.fontSize * 0.35;
  const bottom = span.top + Math.max(span.height, span.fontSize);

  for (const other of page.spans) {
    if (other.id === span.id) continue;
    if (other.left <= span.left + 4) continue;
    const otherTop = other.top - other.fontSize * 0.35;
    const otherBottom = other.top + Math.max(other.height, other.fontSize);
    if (otherBottom < top || otherTop > bottom) continue;
    right = Math.min(right, other.left - COLUMN_GAP_PX);
  }

  return Math.max(original, right - span.left);
}

function sameLine(a: EditablePdfSpan, b: EditablePdfSpan) {
  return Math.abs(a.top - b.top) < Math.max(a.fontSize, b.fontSize) * SAME_LINE_RATIO;
}

function columnsOverlap(aLeft: number, aRight: number, bLeft: number, bRight: number) {
  return aLeft < bRight - 4 && bLeft < aRight - 4;
}

export function computeFlowShifts(
  page: EditablePdfPage,
  measuredHeights: Record<string, number>,
  baselineHeights: Record<string, number>,
): Record<string, number> {
  const extras: Record<string, number> = {};
  for (const span of page.spans) {
    const measured = measuredHeights[span.id];
    const baseline = baselineHeights[span.id];
    if (measured == null || baseline == null) {
      extras[span.id] = 0;
      continue;
    }
    extras[span.id] = Math.max(0, measured - baseline - 1.5);
  }

  const shifts: Record<string, number> = {};
  for (const span of page.spans) {
    let dy = 0;
    for (const other of page.spans) {
      if (other.id === span.id) continue;
      if (sameLine(span, other)) continue;
      if (other.top >= span.top - 0.5) continue;
      if (
        !columnsOverlap(
          span.left,
          span.left + span.width,
          other.left,
          other.left + other.width,
        )
      ) {
        continue;
      }
      dy += extras[other.id] ?? 0;
    }
    shifts[span.id] = dy;
  }
  return shifts;
}

export function pageUsedHeight(
  page: EditablePdfPage,
  shifts: Record<string, number>,
  measuredHeights: Record<string, number>,
  margins: PageMargins,
) {
  let bottom = page.height;
  let moved = false;
  for (const span of page.spans) {
    const dy = shifts[span.id] ?? 0;
    if (dy > 0.5) moved = true;
    const height = measuredHeights[span.id] ?? span.height;
    bottom = Math.max(bottom, span.top + dy + height + margins.bottom);
  }
  return moved ? bottom : page.height;
}

export function recordsClose(
  left: Record<string, number>,
  right: Record<string, number>,
  epsilon = 0.6,
) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (Math.abs((left[key] ?? 0) - (right[key] ?? 0)) > epsilon) return false;
  }
  return true;
}

export function readSpanText(node: HTMLElement) {
  return (node.textContent ?? "").replace(/\r\n/g, "\n");
}

export function insertAtCaret(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  if (typeof document.execCommand === "function") {
    const ok = document.execCommand("insertText", false, text);
    if (ok) return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
