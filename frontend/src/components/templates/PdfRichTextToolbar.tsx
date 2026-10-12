import { useMemo } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Italic,
  List,
  Minus,
  Plus,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpanFormatState, SpanFormatPatch } from "@/lib/pdfRichText";

const FONTS = [
  "Arial",
  "Calibri",
  "Georgia",
  "Garamond",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
  "Helvetica",
  "Palatino Linotype",
];

const SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "22", "24", "28", "32", "36", "48"];

const TEXT_COLORS = [
  "#0F172A",
  "#111827",
  "#1E3A5F",
  "#1D4ED8",
  "#0F766E",
  "#B45309",
  "#BE123C",
  "#6D28D9",
  "#FFFFFF",
  "#64748B",
];

const HIGHLIGHTS = [
  "transparent",
  "#FEF08A",
  "#BBF7D0",
  "#BFDBFE",
  "#FBCFE8",
  "#FDE68A",
  "#E2E8F0",
];

function ToolButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy transition-colors duration-150",
        active ? "bg-principale/15 text-principale" : "hover:bg-[#F1F5F9]",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">{title}</p>
      {children}
    </div>
  );
}

function toggleDecoration(current: string, token: "underline" | "line-through") {
  const parts = current
    .replace("none", "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.includes(token)) {
    const next = parts.filter((part) => part !== token);
    return next.length ? next.join(" ") : "none";
  }
  return [...parts, token].join(" ");
}

export function PdfRichTextToolbar({
  state,
  onChange,
  onReset,
  onToggleBullet,
}: {
  state: SpanFormatState | null;
  onChange: (patch: SpanFormatPatch) => void;
  onReset: () => void;
  onToggleBullet: () => void;
}) {
  const disabled = !state;

  const sizeValue = useMemo(() => {
    if (!state) return "12";
    const rounded = String(Math.max(6, Math.min(72, Math.round(state.fontSizePt))));
    return rounded;
  }, [state]);

  const decoration = state?.textDecoration || "none";
  const fontFamily = state?.fontFamily.split(",")[0]?.replace(/['"]/g, "").trim() || "Arial";

  return (
    <aside className="sticky top-3 w-[228px] shrink-0 self-start rounded-xl border border-gris/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center gap-2 text-navy">
        <Type className="h-4 w-4" />
        <p className="text-sm font-semibold">Texte riche</p>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-navy/50">
        {disabled
          ? "Cliquez un texte du CV pour le mettre en forme."
          : "Entrée : nouvelle ligne. Le texte revient à la marge, comme dans Word."}
      </p>

      <div className="space-y-3">
        <Section title="Police">
          <select
            disabled={disabled}
            value={fontFamily}
            onChange={(event) => onChange({ fontFamily: event.target.value })}
            className="h-8 w-full rounded-lg border border-gris bg-[#F8FAFC] px-2 text-xs text-navy outline-none disabled:opacity-40"
          >
            {!FONTS.includes(fontFamily) ? <option value={fontFamily}>{fontFamily}</option> : null}
            {FONTS.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Taille">
          <div className="flex items-center gap-1">
            <ToolButton
              disabled={disabled}
              label="Diminuer"
              onClick={() => onChange({ fontSizePt: Math.max(6, (state?.fontSizePt ?? 12) - 1) })}
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolButton>
            <select
              disabled={disabled}
              value={SIZES.includes(sizeValue) ? sizeValue : sizeValue}
              onChange={(event) => onChange({ fontSizePt: Number(event.target.value) })}
              className="h-8 min-w-0 flex-1 rounded-lg border border-gris bg-[#F8FAFC] px-1 text-xs text-navy outline-none disabled:opacity-40"
            >
              {!SIZES.includes(sizeValue) ? <option value={sizeValue}>{sizeValue}</option> : null}
              {SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ToolButton
              disabled={disabled}
              label="Augmenter"
              onClick={() => onChange({ fontSizePt: Math.min(72, (state?.fontSizePt ?? 12) + 1) })}
            >
              <Plus className="h-3.5 w-3.5" />
            </ToolButton>
          </div>
        </Section>

        <Section title="Style">
          <div className="flex flex-wrap gap-1">
            <ToolButton
              disabled={disabled}
              active={!!state?.bold}
              label="Gras"
              onClick={() => onChange({ bold: !state?.bold })}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={!!state?.italic}
              label="Italique"
              onClick={() => onChange({ italic: !state?.italic })}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={decoration.includes("underline")}
              label="Souligné"
              onClick={() => onChange({ textDecoration: toggleDecoration(decoration, "underline") })}
            >
              <Underline className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={decoration.includes("line-through")}
              label="Barré"
              onClick={() => onChange({ textDecoration: toggleDecoration(decoration, "line-through") })}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={state?.verticalAlign === "super"}
              label="Exposant"
              onClick={() =>
                onChange({
                  verticalAlign: state?.verticalAlign === "super" ? "baseline" : "super",
                })
              }
            >
              <Superscript className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={state?.verticalAlign === "sub"}
              label="Indice"
              onClick={() =>
                onChange({
                  verticalAlign: state?.verticalAlign === "sub" ? "baseline" : "sub",
                })
              }
            >
              <Subscript className="h-3.5 w-3.5" />
            </ToolButton>
          </div>
        </Section>

        <Section title="Couleur du texte">
          <div className="flex flex-wrap gap-1.5">
            {TEXT_COLORS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                title={value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange({ color: value })}
                className={cn(
                  "h-5 w-5 rounded-full border border-black/10 disabled:opacity-40",
                  state?.color.toLowerCase() === value.toLowerCase() && "ring-2 ring-principale ring-offset-1",
                  value === "#FFFFFF" && "border-gris",
                )}
                style={{ background: value }}
              />
            ))}
            <label className={cn("relative h-5 w-5 overflow-hidden rounded-full border border-gris", disabled && "opacity-40")}>
              <input
                type="color"
                disabled={disabled}
                value={state?.color.startsWith("#") ? state.color : "#0F172A"}
                onChange={(event) => onChange({ color: event.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
              />
              <span className="block h-full w-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />
            </label>
          </div>
        </Section>

        <Section title="Surlignage">
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHTS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                title={value === "transparent" ? "Aucun" : value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange({ backgroundColor: value })}
                className={cn(
                  "h-5 w-5 rounded-full border border-black/10 disabled:opacity-40",
                  (state?.backgroundColor || "transparent") === value && "ring-2 ring-principale ring-offset-1",
                )}
                style={{
                  background:
                    value === "transparent"
                      ? "linear-gradient(to bottom right, transparent 46%, #ef4444 46% 54%, transparent 54%)"
                      : value,
                }}
              />
            ))}
            <Highlighter className="ml-0.5 h-4 w-4 self-center text-navy/35" />
          </div>
        </Section>

        <Section title="Alignement">
          <div className="flex gap-1">
            <ToolButton
              disabled={disabled}
              active={(state?.textAlign || "left") === "left"}
              label="Gauche"
              onClick={() => onChange({ textAlign: "left" })}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={state?.textAlign === "center"}
              label="Centre"
              onClick={() => onChange({ textAlign: "center" })}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton
              disabled={disabled}
              active={state?.textAlign === "right"}
              label="Droite"
              onClick={() => onChange({ textAlign: "right" })}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton disabled={disabled} label="Puce" onClick={onToggleBullet}>
              <List className="h-3.5 w-3.5" />
            </ToolButton>
          </div>
        </Section>

        <Section title="Casse">
          <div className="flex gap-1">
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                onChange({ textTransform: state?.textTransform === "uppercase" ? "none" : "uppercase" })
              }
              className={cn(
                "h-8 rounded-lg px-2 text-[11px] font-semibold text-navy hover:bg-[#F1F5F9] disabled:opacity-35",
                state?.textTransform === "uppercase" && "bg-principale/15 text-principale",
              )}
            >
              MAJ
            </button>
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                onChange({ textTransform: state?.textTransform === "capitalize" ? "none" : "capitalize" })
              }
              className={cn(
                "h-8 rounded-lg px-2 text-[11px] font-semibold text-navy hover:bg-[#F1F5F9] disabled:opacity-35",
                state?.textTransform === "capitalize" && "bg-principale/15 text-principale",
              )}
            >
              Abc
            </button>
          </div>
        </Section>

        <Section title="Interligne">
          <div className="flex gap-1">
            {["1", "1.15", "1.5", "2"].map((value) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange({ lineHeight: value })}
                className={cn(
                  "h-8 flex-1 rounded-lg text-[11px] font-medium text-navy hover:bg-[#F1F5F9] disabled:opacity-35",
                  (state?.lineHeight || "1") === value && "bg-principale/15 text-principale",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Section>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onReset}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-gris text-xs font-medium text-navy hover:bg-[#F8FAFC] disabled:opacity-35"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
          Effacer le style
        </button>
      </div>
    </aside>
  );
}
