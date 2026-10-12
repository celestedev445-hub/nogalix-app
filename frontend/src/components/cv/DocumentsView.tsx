import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Download,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { CareerDocument, DocumentKind } from "@/lib/documentTypes";
import { useCvStore } from "@/store/cvStore";
import { useDocumentStore } from "@/store/documentStore";
import { useAuthStore } from "@/store/authStore";
import { canUseCapability } from "@/lib/planCapabilities";
import { PlanFeatureBadge, PlanPageHeading } from "@/components/plan/PlanFeatureBadge";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const ALLOWED = [".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
const MAX_SIZE = 10 * 1024 * 1024;

const KIND_META: Record<
  DocumentKind,
  { label: string; icon: typeof FileText; tint: string; iconClass: string }
> = {
  lettre: {
    label: "Lettre",
    icon: Mail,
    tint: "bg-[#EDE9FE] text-indigo",
    iconClass: "text-indigo",
  },
  export: {
    label: "Copie texte",
    icon: FileText,
    tint: "bg-indigo-clair text-principale",
    iconClass: "text-principale",
  },
  piece: {
    label: "Pièce",
    icon: Paperclip,
    tint: "bg-emerald-50 text-succes",
    iconClass: "text-succes",
  },
};

const FILTERS: { id: "tous" | DocumentKind; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "lettre", label: "Lettres" },
  { id: "export", label: "Copies texte" },
  { id: "piece", label: "Pièces jointes" },
];

function formatBytes(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultLetterBody(name: string, title: string) {
  return `Madame, Monsieur,

Actuellement ${title || "en recherche de nouvelles opportunités"}, je vous adresse ma candidature pour rejoindre votre équipe.

Je serai ravi d'échanger sur la manière dont je peux contribuer à vos projets.

Cordialement,${name ? `\n${name}` : ""}`;
}

export function DocumentsView() {
  const router = useRouter();
  const items = useDocumentStore((s) => s.items);
  const upsert = useDocumentStore((s) => s.upsert);
  const remove = useDocumentStore((s) => s.remove);
  const upload = useDocumentStore((s) => s.upload);
  const download = useDocumentStore((s) => s.download);
  const loadDocuments = useDocumentStore((s) => s.load);
  const loadingDocs = useDocumentStore((s) => s.loading);
  const loadedDocs = useDocumentStore((s) => s.loaded);
  const authenticated = useAuthStore((s) => s.authenticated);
  const cvs = useCvStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<"tous" | DocumentKind>("tous");
  const [dragging, setDragging] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<CareerDocument | null>(null);
  const [toDelete, setToDelete] = useState<CareerDocument | null>(null);
  const [savingLetter, setSavingLetter] = useState(false);
  const [savingExport, setSavingExport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [letterTitle, setLetterTitle] = useState("");
  const [letterCvId, setLetterCvId] = useState(cvs.find((cv) => cv.principal)?.id ?? cvs[0]?.id ?? "");
  const [letterBody, setLetterBody] = useState("");
  const [exportCvId, setExportCvId] = useState(cvs.find((cv) => cv.principal)?.id ?? cvs[0]?.id ?? "");

  const displayName =
    user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "";

  useEffect(() => {
    if (!authenticated) return;
    void loadDocuments();
  }, [authenticated, loadDocuments]);

  const counts = useMemo(
    () => ({
      lettre: items.filter((item) => item.kind === "lettre").length,
      export: items.filter((item) => item.kind === "export").length,
      piece: items.filter((item) => item.kind === "piece").length,
    }),
    [items],
  );

  const visible = items.filter((item) => filter === "tous" || item.kind === filter);

  function openNewLetter() {
    if (!canUseCapability(user, "documents.letters")) {
      toast({
        title: "Lettres IA",
        description: "Une lettre consomme un essai IA. Inclus aussi dans Pro et Premium.",
      });
      router.push("/plans");
      return;
    }
    const cv = cvs.find((item) => item.id === letterCvId) ?? cvs[0];
    setEditing(null);
    setLetterTitle(cv ? `Lettre : ${cv.title}` : "Lettre de motivation");
    setLetterCvId(cv?.id ?? "");
    setLetterBody(defaultLetterBody(displayName, cv?.identity.title || cv?.title || ""));
    setLetterOpen(true);
  }

  function openEditLetter(doc: CareerDocument) {
    setEditing(doc);
    setLetterTitle(doc.title);
    setLetterCvId(doc.cvId ?? "");
    setLetterBody(doc.body ?? "");
    setLetterOpen(true);
  }

  async function saveLetter() {
    const title = letterTitle.trim() || "Lettre de motivation";
    setSavingLetter(true);
    try {
      await upsert({
        ...(editing ? { id: editing.id } : {}),
        kind: "lettre",
        title,
        fileName: `${slugify(title) || "lettre"}.txt`,
        mime: "text/plain",
        cvId: letterCvId || undefined,
        body: letterBody,
      });
      setLetterOpen(false);
      toast({ title: editing ? "Lettre mise à jour" : "Lettre créée", variant: "success" });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSavingLetter(false);
    }
  }

  async function saveExport() {
    const cv = cvs.find((item) => item.id === exportCvId);
    if (!cv) return;
    const snapshot = [
      cv.identity.firstName,
      cv.identity.lastName,
      cv.identity.title,
      cv.summary,
      ...cv.experiences.map((item) => `${item.title} · ${item.company}`),
    ]
      .filter(Boolean)
      .join("\n");
    setSavingExport(true);
    try {
      await upsert({
        kind: "export",
        title: `Copie texte : ${cv.title}`,
        fileName: `${slugify(cv.title) || "cv"}.txt`,
        mime: "text/plain",
        cvId: cv.id,
        body: snapshot,
      });
      setExportOpen(false);
      toast({
        title: "Copie texte enregistrée",
        description: "Brouillon texte du CV. Ce n'est pas un PDF.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSavingExport(false);
    }
  }

  async function importFile(file: File | null) {
    if (!file || uploading) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      toast({
        title: "Format non pris en charge",
        description: "PDF, Word (.docx) ou image (JPG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Fichier trop lourd", description: "Maximum 10 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await upload(file, { kind: "piece", title: file.name.replace(/\.[^.]+$/, "") });
      toast({ title: "Fichier importé", variant: "success" });
    } catch (error) {
      toast({
        title: "Import impossible",
        description: error instanceof Error ? error.message : "Réessayez avec un autre fichier.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function downloadDoc(doc: CareerDocument) {
    setDownloadingId(doc.id);
    try {
      await download(doc);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <PlanPageHeading plan="essai-ia">Documents</PlanPageHeading>
          <p className="mt-1 text-sm text-navy/65">
            Lettres de motivation, exports et pièces jointes. Vos CV restent dans Mes CV.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full rounded-xl bg-indigo-clair px-5 text-principale shadow-none hover:bg-indigo-clair/80 sm:w-auto"
            onClick={() => setExportOpen(true)}
            disabled={!cvs.length}
          >
            <Download className="h-4 w-4" />
            Copie texte d&apos;un CV
          </Button>
          <Button type="button" className="h-11 w-full rounded-xl px-5 shadow-brand sm:w-auto" onClick={openNewLetter}>
            <Plus className="h-4 w-4" />
            Nouvelle lettre
          </Button>
        </div>
      </div>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { key: "lettre" as const, name: "Lettres", hint: "Pour accompagner une candidature", plan: "essai-ia" as const },
              { key: "export" as const, name: "Copies texte", hint: "Brouillons texte générés depuis un CV" },
              { key: "piece" as const, name: "Pièces jointes", hint: "Diplômes, certificats, justificatifs" },
            ] as const
          ).map((item) => {
            const meta = KIND_META[item.key];
            const Icon = meta.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  "rounded-xl bg-[#F8FAFC] p-4 text-left transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:transition-none",
                  cardShadow,
                  filter === item.key && "ring-2 ring-principale/40",
                )}
              >
                <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", meta.tint)}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-2xl font-extrabold text-navy">{counts[item.key]}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-navy">
                  {item.name}
                  {"plan" in item && item.plan ? <PlanFeatureBadge plan={item.plan} compact /> : null}
                </p>
                <p className="text-xs text-navy/50">{item.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-semibold transition-transform duration-brand ease-brand active:scale-[0.97] motion-reduce:transition-none",
                  filter === item.id ? "bg-indigo-clair text-principale" : "text-navy/55 hover:bg-indigo-clair/70",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-navy/50">{visible.length} document{visible.length > 1 ? "s" : ""}</p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.length === 0 && loadingDocs && !loadedDocs ? (
            <div className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-[#F8FAFC] px-4 py-10 text-sm text-navy/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des documents…
            </div>
          ) : visible.length === 0 ? (
            <div className="col-span-full rounded-xl bg-[#F8FAFC] px-4 py-10 text-center">
              <p className="font-semibold text-navy">Aucun document dans ce filtre</p>
              <p className="mt-1 text-sm text-navy/55">
                Créez une lettre, importez une pièce, ou générez une copie texte depuis un CV.
              </p>
            </div>
          ) : null}
          {visible.map((doc) => {
            const meta = KIND_META[doc.kind];
            const Icon = meta.icon;
            const cvTitle = cvs.find((cv) => cv.id === doc.cvId)?.title;
            return (
              <article
                key={doc.id}
                className={cn(
                  "flex min-w-0 flex-col rounded-xl bg-[#F8FAFC] p-4",
                  cardShadow,
                  "transition-transform duration-brand ease-brand hover:-translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:transition-none",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy/55">
                    {meta.label}
                  </span>
                </div>
                <p className="mt-3 truncate font-semibold text-navy" title={doc.title}>
                  {doc.title}
                </p>
                <p className="truncate text-xs text-navy/50">
                  {doc.fileName} · {formatBytes(doc.size)}
                </p>
                <p className="mt-1 text-xs text-navy/45">
                  {cvTitle ? `${cvTitle} · ` : ""}
                  {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: fr })}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-xl bg-white px-3 text-principale shadow-none"
                    disabled={downloadingId === doc.id}
                    onClick={() => void downloadDoc(doc)}
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Télécharger
                  </Button>
                  {doc.kind === "lettre" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl"
                      onClick={() => openEditLetter(doc)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                  ) : null}
                  {doc.cvId ? (
                    <Button asChild size="sm" variant="ghost" className="h-8 rounded-xl">
                      <Link href={`/cv/${doc.cvId}`}>CV</Link>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-navy/40 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Supprimer ${doc.title}`}
                    onClick={() => setToDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}

          <button
            type="button"
            className={cn(
              "flex min-h-[14rem] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-[#F8FAFC] px-4 text-center text-navy/55",
              dragging ? "border-principale bg-indigo-clair text-principale" : "border-principale/30 hover:border-principale/60 hover:text-principale",
            )}
            disabled={uploading}
            aria-busy={uploading}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void importFile(event.dataTransfer.files[0] ?? null);
            }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-clair text-principale">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
            </span>
            <span className="mt-3 font-semibold text-navy">{uploading ? "Import en cours…" : "Importer une pièce"}</span>
            <span className="text-xs">PDF, Word, image · 10 Mo max.</span>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED.join(",")}
              className="hidden"
              onChange={(event) => {
                void importFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </button>
        </div>
      </section>

      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Modifier la lettre" : "Nouvelle lettre"}</DialogTitle>
            <DialogDescription>
              Rédigez une lettre liée à un CV. L&apos;assistant en bas à droite peut aussi vous aider.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="letter-title">Titre</Label>
              <Input id="letter-title" value={letterTitle} onChange={(e) => setLetterTitle(e.target.value)} />
            </div>
            {cvs.length ? (
              <div>
                <Label>CV associé</Label>
                <Select value={letterCvId} onValueChange={setLetterCvId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choisir un CV" />
                  </SelectTrigger>
                  <SelectContent>
                    {cvs.map((cv) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        {cv.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="letter-body">Contenu</Label>
              <Textarea
                id="letter-body"
                rows={10}
                value={letterBody}
                onChange={(e) => setLetterBody(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setLetterOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="rounded-xl" disabled={savingLetter} onClick={() => void saveLetter()}>
              {savingLetter ? <Loader2 className="animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Copie texte d&apos;un CV</DialogTitle>
            <DialogDescription>
              Enregistre un brouillon texte dans Documents. Ce n&apos;est pas un export PDF.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>CV source</Label>
            <Select value={exportCvId} onValueChange={setExportCvId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cvs.map((cv) => (
                  <SelectItem key={cv.id} value={cv.id}>
                    {cv.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setExportOpen(false)}>
              Annuler
            </Button>
            <Button type="button" className="rounded-xl" disabled={savingExport} onClick={() => void saveExport()}>
              {savingExport ? <Loader2 className="animate-spin" /> : null}
              Enregistrer la copie texte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `« ${toDelete.title} » sera définitivement retiré de vos documents.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                void remove(toDelete.id);
                setToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
