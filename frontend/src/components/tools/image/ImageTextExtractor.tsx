import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "@/platform/link";
import {
  Bold,
  Check,
  ChevronDown,
  CircleDot,
  Copy,
  Download,
  FileDown,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ScanText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import {
  parseMarkdown,
  toDocxBlob,
  toHtml,
  toPlainText,
  type InlineRun,
  type MdBlock,
} from "@/lib/markdownLite";
import { extractImageMarkdown } from "@/services/imageText";
import { deleteDocument, uploadDocument } from "@/services/documents";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((run, i) => {
        let node: ReactNode = run.text;
        if (run.italic) node = <em>{node}</em>;
        if (run.bold) node = <strong className="font-semibold">{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function Preview({ blocks }: { blocks: MdBlock[] }) {
  if (blocks.length === 0) return <p className="text-sm text-navy/40">Rien à afficher.</p>;
  const headingClass = ["text-2xl font-bold", "text-xl font-bold", "text-lg font-semibold", "text-base font-semibold"];
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-navy">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h1";
            return (
              <Tag key={i} className={cn("font-display text-navy", headingClass[block.level - 1])}>
                <Runs runs={block.runs} />
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <span key={j}>
                    {j > 0 ? <br /> : null}
                    <Runs runs={line} />
                  </span>
                ))}
              </p>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={cn("space-y-1 pl-6", block.ordered ? "list-decimal" : "list-disc")}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Runs runs={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "table":
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.header.map((cell, j) => (
                        <th key={j} className="border border-gris bg-indigo-clair/50 px-2.5 py-1.5 text-left font-semibold">
                          <Runs runs={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gris px-2.5 py-1.5 align-top">
                            <Runs runs={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "rule":
            return <hr key={i} className="border-gris" />;
        }
      })}
    </div>
  );
}

type Format = "wrap-bold" | "wrap-italic" | "h1" | "h2" | "ul" | "ol";

/** Applique une mise en forme Markdown à la sélection du textarea. */
function applyFormat(area: HTMLTextAreaElement, value: string, format: Format) {
  const start = area.selectionStart;
  const end = area.selectionEnd;
  if (format === "wrap-bold" || format === "wrap-italic") {
    const mark = format === "wrap-bold" ? "**" : "*";
    const selected = value.slice(start, end) || "texte";
    const next = value.slice(0, start) + mark + selected + mark + value.slice(end);
    return { next, selStart: start + mark.length, selEnd: start + mark.length + selected.length };
  }
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = value.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const strip = (line: string) => line.replace(/^(#{1,6}\s+|[-*+•]\s+|\d+[.)]\s+)/, "");
  const prefixFor = (i: number) =>
    format === "h1" ? "# " : format === "h2" ? "## " : format === "ul" ? "- " : `${i + 1}. `;
  const already = lines.every((line, i) => line.startsWith(prefixFor(i)));
  const replaced = lines.map((line, i) => (already ? strip(line) : prefixFor(i) + strip(line))).join("\n");
  const next = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
  return { next, selStart: lineStart, selEnd: lineStart + replaced.length };
}

export function ImageTextExtractor({
  analysisBlob,
  fileName,
  active,
}: {
  analysisBlob: Blob;
  fileName: string;
  active: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const authenticated = useAuthStore((s) => s.authenticated);
  const [original, setOriginal] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [view, setView] = useState<"preview" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; markdown: string } | null>(null);
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const stem = fileName.replace(/\.[^.]+$/, "") || "texte";
  const title = `Texte extrait · ${stem}`;

  const modified = status === "ready" && markdown !== original;
  /** Corrections pas encore rangées dans Mes documents. */
  const unsaved = saved ? markdown !== saved.markdown : modified;
  const hasText = markdown.trim().length > 0;

  const run = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const text = await extractImageMarkdown(analysisBlob);
      setOriginal(text);
      setMarkdown(text);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction impossible.");
      setStatus("error");
    }
  }, [analysisBlob]);

  useEffect(() => {
    if (active && status === "idle") void run();
  }, [active, status, run]);

  // Prévenir avant de quitter la page avec des corrections non enregistrées.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function rerun() {
    if (modified && !window.confirm("Relancer l'extraction remplacera vos corrections. Continuer ?")) return;
    setSaved(null);
    void run();
  }

  function restore() {
    if (!window.confirm("Revenir au texte extrait d'origine ? Vos corrections seront perdues.")) return;
    setMarkdown(original);
  }

  function format(kind: Format) {
    const area = areaRef.current;
    if (!area) return;
    const { next, selStart, selEnd } = applyFormat(area, markdown, kind);
    setMarkdown(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(selStart, selEnd);
    });
  }

  async function copy() {
    const plain = toPlainText(blocks);
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([toHtml(blocks)], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copie impossible", description: "Votre navigateur a bloqué le presse-papiers.", variant: "destructive" });
    }
  }

  async function downloadDocx() {
    try {
      saveBlob(await toDocxBlob(blocks), `${stem}.docx`);
    } catch {
      toast({ title: "Export Word impossible", variant: "destructive" });
    }
  }

  /** Enregistre le texte (avec vos corrections) en Word dans « Mes documents ». */
  async function saveToDocuments() {
    setSaving(true);
    try {
      const file = new File([await toDocxBlob(blocks)], `${stem}.docx`, { type: DOCX_MIME });
      const doc = await uploadDocument(file, { kind: "export", title });
      // Un seul document par extraction : la version précédente est remplacée.
      if (saved?.id) await deleteDocument(saved.id).catch(() => undefined);
      setSaved({ id: doc.id, markdown });
      toast({ title: "Enregistré dans Mes documents", description: `${title}.docx`, variant: "success" });
    } catch (err) {
      toast({
        title: "Enregistrement impossible",
        description: err instanceof Error ? err.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const secondary = "h-9 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80";
  const tool =
    "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-navy/65 transition-colors hover:bg-indigo-clair hover:text-principale";

  const statusChip = !hasText || status !== "ready" ? null : saved && !unsaved ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-succes/10 px-2.5 py-1 text-xs font-medium text-succes">
      <Check className="h-3.5 w-3.5" />
      Enregistré
      <Link href="/documents" className="underline underline-offset-2">
        Voir
      </Link>
    </span>
  ) : unsaved ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
      <CircleDot className="h-3.5 w-3.5" />
      {authenticated ? "Modifié · non enregistré" : "Modifié"}
    </span>
  ) : null;

  return (
    <div className={cn("min-w-0 rounded-xl bg-white p-4 sm:p-5", cardShadow)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-[#F1F3F5] p-1 text-xs font-semibold">
            {(
              [
                { id: "preview", label: "Aperçu" },
                { id: "edit", label: "Modifier" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-pressed={view === item.id}
                disabled={status !== "ready"}
                className={cn(
                  "rounded-full px-3.5 py-1.5 transition disabled:opacity-50",
                  view === item.id ? "bg-principale text-white shadow-sm" : "text-navy/55",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {statusChip}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className={secondary} onClick={() => void copy()} disabled={!hasText}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="secondary" className={secondary} disabled={!hasText}>
                <Download className="h-4 w-4" />
                Télécharger
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem] rounded-xl">
              <DropdownMenuItem className="rounded-lg" onSelect={() => void downloadDocx()}>
                <FileDown className="h-4 w-4" />
                Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg"
                onSelect={() => saveBlob(new Blob([toPlainText(blocks)], { type: "text/plain;charset=utf-8" }), `${stem}.txt`)}
              >
                <FileText className="h-4 w-4" />
                Texte (.txt)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg"
                onSelect={() => saveBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `${stem}.md`)}
              >
                <FileText className="h-4 w-4" />
                Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {authenticated ? (
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() => void saveToDocuments()}
              disabled={!hasText || saving || saved?.markdown === markdown}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          ) : (
            <Button type="button" size="sm" className="h-9 rounded-xl" onClick={() => void downloadDocx()} disabled={!hasText}>
              <Save className="h-4 w-4" />
              Enregistrer en Word
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 rounded-xl text-navy/60"
            onClick={rerun}
            disabled={status === "loading"}
            title="Relancer l'extraction"
            aria-label="Relancer l'extraction"
          >
            <RefreshCw className={cn("h-4 w-4", status === "loading" && "animate-spin")} />
          </Button>
        </div>
      </div>

      {status === "loading" ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm font-medium text-navy">
          <ScanText className="h-7 w-7 animate-pulse text-principale" />
          Extraction du texte et de sa mise en forme…
          <span className="flex items-center gap-1.5 text-xs font-normal text-navy/50">
            <Loader2 className="h-3 w-3 animate-spin" />
            Environ 10 à 40 secondes
          </span>
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button type="button" size="sm" className="h-9 rounded-xl" onClick={() => void run()}>
            Réessayer
          </Button>
        </div>
      ) : status === "ready" && !hasText && !original.trim() ? (
        <p className="py-12 text-center text-sm text-navy/50">Aucun texte trouvé dans cette image.</p>
      ) : view === "preview" ? (
        <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-gris bg-[#FBFCFE] p-4 sm:p-6">
          <Preview blocks={blocks} />
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-gris bg-[#F6F7FB] p-1">
              <button type="button" className={tool} onClick={() => format("h1")} title="Grand titre" aria-label="Grand titre">
                <Heading1 className="h-4 w-4" />
              </button>
              <button type="button" className={tool} onClick={() => format("h2")} title="Sous-titre" aria-label="Sous-titre">
                <Heading2 className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-gris" aria-hidden />
              <button type="button" className={tool} onClick={() => format("wrap-bold")} title="Gras" aria-label="Gras">
                <Bold className="h-4 w-4" />
              </button>
              <button type="button" className={tool} onClick={() => format("wrap-italic")} title="Italique" aria-label="Italique">
                <Italic className="h-4 w-4" />
              </button>
              <span className="mx-1 h-5 w-px bg-gris" aria-hidden />
              <button type="button" className={tool} onClick={() => format("ul")} title="Liste à puces" aria-label="Liste à puces">
                <List className="h-4 w-4" />
              </button>
              <button type="button" className={tool} onClick={() => format("ol")} title="Liste numérotée" aria-label="Liste numérotée">
                <ListOrdered className="h-4 w-4" />
              </button>
              {modified ? (
                <button type="button" className={cn(tool, "ml-auto")} onClick={restore} title="Revenir au texte extrait">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Texte d&apos;origine
                </button>
              ) : null}
            </div>
            <textarea
              ref={areaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck
              lang="fr"
              className="block min-h-[50vh] w-full resize-y rounded-b-lg border border-gris bg-white p-4 font-mono text-[13px] leading-relaxed text-navy outline-none focus:border-principale focus:ring-2 focus:ring-principale/20"
              aria-label="Texte extrait à corriger"
            />
            <p className="mt-1.5 text-[11px] text-navy/45">
              Sélectionnez un passage puis un bouton, ou tapez # Titre, **gras**, *italique*, - puce, | tableau |.
            </p>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 flex h-[34px] items-center text-xs font-semibold uppercase tracking-wide text-navy/45">
              Aperçu en direct
            </p>
            <div className="max-h-[calc(50vh+2px)] min-h-[50vh] overflow-y-auto rounded-lg border border-gris bg-[#FBFCFE] p-4 sm:p-5">
              <Preview blocks={blocks} />
            </div>
          </div>
        </div>
      )}

      {status === "ready" && hasText ? (
        <p className="mt-3 text-[11px] text-navy/45">
          {authenticated
            ? "« Enregistrer » range la version corrigée en Word dans Mes documents ; les téléchargements reprennent aussi vos corrections."
            : "Les téléchargements reprennent vos corrections. Connectez-vous pour enregistrer dans Mes documents."}
        </p>
      ) : null}
    </div>
  );
}
