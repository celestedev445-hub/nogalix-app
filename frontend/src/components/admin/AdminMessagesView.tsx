import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  CheckCheck,
  Eye,
  Loader2,
  Mail,
  MailOpen,
  MessageCircleReply,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandLoader } from "@/components/brand/BrandLoader";
import {
  parseAdminDate,
  type AdminMessage,
  type AdminMessageStatus,
} from "@/lib/demoAdmin";
import { useAdminStore } from "@/store/adminStore";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

type Filter = "tous" | AdminMessageStatus;

function ago(value: string | null) {
  const date = parseAdminDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true, locale: fr }) : "—";
}

function mailtoHref(msg: AdminMessage) {
  const subject = /^re\s*:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`;
  return `mailto:${msg.email}?subject=${encodeURIComponent(subject)}`;
}

function statusBadge(status: AdminMessageStatus) {
  if (status === "nouveau") {
    return (
      <Badge className="rounded-full bg-principale text-white hover:bg-principale">Nouveau</Badge>
    );
  }
  if (status === "lu") {
    return (
      <Badge
        variant="secondary"
        className="rounded-full bg-indigo-clair text-indigo hover:bg-indigo-clair"
      >
        Lu
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="rounded-full">
      Répondu
    </Badge>
  );
}

export function AdminMessagesView() {
  const messages = useAdminStore((s) => s.messages);
  const meta = useAdminStore((s) => s.messagesMeta);
  const loading = useAdminStore((s) => s.messagesLoading);
  const error = useAdminStore((s) => s.messagesError);
  const initialFilters = useAdminStore((s) => s.messagesFilters);
  const stats = useAdminStore((s) => s.stats);
  const loadStats = useAdminStore((s) => s.loadStats);
  const loadMessages = useAdminStore((s) => s.loadMessages);

  function changePage(options: { page?: number; perPage?: number }) {
    void loadMessages(undefined, options);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const setMessageStatus = useAdminStore((s) => s.setMessageStatus);
  const markAllMessagesRead = useAdminStore((s) => s.markAllMessagesRead);
  const removeMessage = useAdminStore((s) => s.removeMessage);
  const [query, setQuery] = useState(initialFilters.q);
  const [filter, setFilter] = useState<Filter>(initialFilters.status ?? "tous");
  const [toDelete, setToDelete] = useState<AdminMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingSnapshot, setViewingSnapshot] = useState<AdminMessage | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const firstRun = useRef(true);

  const viewing =
    (viewingId ? messages.find((m) => m.id === viewingId) : null) ?? viewingSnapshot;

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const status = filter === "tous" ? undefined : filter;
    if (firstRun.current) {
      firstRun.current = false;
      void loadMessages({ q: query, status });
      return;
    }
    const timer = window.setTimeout(() => {
      void loadMessages({ q: query, status });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function changeFilter(next: Filter) {
    setFilter(next);
    void loadMessages({ q: query, status: next === "tous" ? undefined : next });
  }

  const newCount = Math.max(
    stats?.messagesNew ?? 0,
    messages.filter((m) => m.status === "nouveau").length,
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "nouveau", label: "Nouveaux" },
    { id: "lu", label: "Lus" },
    { id: "répondu", label: "Répondus" },
  ];

  async function runStatus(id: string, status: AdminMessageStatus, silent = false) {
    setBusyId(id);
    try {
      await setMessageStatus(id, status, { silent });
    } finally {
      setBusyId(null);
    }
  }

  function openMessage(msg: AdminMessage) {
    setViewingId(msg.id);
    setViewingSnapshot(msg.status === "nouveau" ? { ...msg, status: "lu" } : msg);
    if (msg.status === "nouveau") void runStatus(msg.id, "lu", true);
  }

  function onReply(msg: AdminMessage) {
    // Le lien mailto s'ouvre nativement ; on marque le message comme répondu.
    if (msg.status !== "répondu") {
      setViewingSnapshot((current) =>
        current && current.id === msg.id ? { ...current, status: "répondu" } : current,
      );
      void runStatus(msg.id, "répondu");
    }
  }

  async function onMarkAll() {
    setMarkingAll(true);
    try {
      await markAllMessagesRead();
    } finally {
      setMarkingAll(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const ok = await removeMessage(toDelete.id);
    setDeleting(false);
    if (ok) {
      if (viewingId === toDelete.id) {
        setViewingId(null);
        setViewingSnapshot(null);
      }
      setToDelete(null);
    }
  }

  function replyButton(msg: AdminMessage, size: "sm" | "default" = "sm") {
    return (
      <Button
        asChild
        size={size}
        className={cn(
          "rounded-xl bg-principale px-3 shadow-brand hover:bg-principale/90",
          size === "sm" ? "h-8" : "h-10",
        )}
      >
        <a href={mailtoHref(msg)} onClick={() => onReply(msg)}>
          <MessageCircleReply className="h-3.5 w-3.5" />
          Répondre
        </a>
      </Button>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-principale">Administration</p>
          <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">
            Messages
          </h1>
          <p className="mt-1 text-sm text-navy/65">
            Demandes reçues via le formulaire de contact.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl text-navy/60 hover:bg-indigo-clair hover:text-principale"
            disabled={loading}
            onClick={() => {
              void loadMessages();
              void loadStats();
            }}
            aria-label="Actualiser les messages"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
            disabled={newCount === 0 || markingAll}
            onClick={() => void onMarkAll()}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      <section className={cn("min-w-0 rounded-xl bg-white p-5", cardShadow)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un message…"
              aria-label="Rechercher un message"
              className="h-10 rounded-xl border-gris pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => changeFilter(item.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === item.id
                    ? "bg-indigo-clair text-principale"
                    : "text-navy/60 hover:bg-indigo-clair hover:text-principale",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-navy/50">
          {meta.total} message{meta.total > 1 ? "s" : ""}
        </p>

        {loading && messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <BrandLoader size={48} label="Chargement des messages" />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <p className="text-sm text-navy/60">{error}</p>
            <Button type="button" className="h-9 rounded-xl" onClick={() => void loadMessages()}>
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            <ul className={cn("mt-3 space-y-3 transition-opacity", loading && "opacity-60")}>
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    "min-w-0 rounded-xl border border-gris px-4 py-4",
                    msg.status === "nouveau" ? "bg-indigo-clair/40" : "bg-indigo-clair/15",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="text-left font-semibold text-navy hover:text-principale"
                          onClick={() => openMessage(msg)}
                        >
                          {msg.subject || "Sans objet"}
                        </button>
                        {statusBadge(msg.status)}
                      </div>
                      <p className="mt-1 break-all text-xs text-navy/50">
                        {msg.name} · {msg.email}
                      </p>
                    </div>
                    <p className="shrink-0 text-[11px] text-navy/45">{ago(msg.createdAt)}</p>
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-navy/75">
                    {msg.preview || msg.message}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 rounded-xl bg-white text-principale shadow-none hover:bg-indigo-clair"
                      onClick={() => openMessage(msg)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Voir
                    </Button>
                    {replyButton(msg)}
                    {msg.status === "nouveau" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-xl bg-white text-principale shadow-none hover:bg-indigo-clair"
                        disabled={busyId === msg.id}
                        onClick={() => void runStatus(msg.id, "lu")}
                      >
                        <MailOpen className="h-3.5 w-3.5" />
                        Marquer lu
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-xl text-navy/60 hover:bg-indigo-clair hover:text-principale"
                        disabled={busyId === msg.id}
                        onClick={() => void runStatus(msg.id, "nouveau")}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Marquer non lu
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-xl text-navy/50 hover:bg-red-50 hover:text-red-600"
                      disabled={busyId === msg.id}
                      onClick={() => setToDelete(msg)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-navy/50">Aucun message trouvé.</p>
            ) : null}
          </>
        )}

        <AdminPagination
          meta={meta}
          itemLabel={["message", "messages"]}
          disabled={loading}
          onPage={(page) => changePage({ page })}
          onPerPage={(perPage) => changePage({ perPage })}
        />
      </section>

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingId(null);
            setViewingSnapshot(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
          {viewing ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-6">
                  <DialogTitle className="text-left">{viewing.subject || "Sans objet"}</DialogTitle>
                  {statusBadge(viewing.status)}
                </div>
                <DialogDescription className="break-all text-left">
                  {viewing.name} ·{" "}
                  <a href={`mailto:${viewing.email}`} className="text-principale">
                    {viewing.email}
                  </a>
                </DialogDescription>
              </DialogHeader>
              <p className="text-xs text-navy/45">
                {(() => {
                  const date = parseAdminDate(viewing.createdAt);
                  return date
                    ? `Reçu le ${format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`
                    : null;
                })()}
              </p>
              <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm leading-relaxed text-navy/80">
                <p className="whitespace-pre-wrap break-words">
                  {viewing.message || viewing.preview}
                </p>
              </div>
              <DialogFooter className="flex-row flex-wrap justify-end gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-xl text-navy/50 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setToDelete(viewing)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
                {replyButton(viewing, "default")}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `« ${toDelete.subject} » de ${toDelete.name} sera définitivement retiré.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
