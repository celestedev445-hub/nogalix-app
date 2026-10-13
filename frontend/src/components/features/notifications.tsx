import { useState } from "react";
import { useRouter } from "@/platform/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellOff,
  Briefcase,
  CheckCheck,
  Crown,
  CreditCard,
  FileText,
  FolderOpen,
  Info,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { notificationHref, type AppNotification } from "@/lib/notificationTypes";
import { useNotificationStore } from "@/store/notificationsStore";
import { cn } from "@/lib/utils";

type NotificationPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  onClose?: () => void;
};

type NotificationVisual = { label: string; icon: LucideIcon; tone: string };

/** Libellé, icône et couleur selon le type (code technique) puis la catégorie de la notification. */
const BY_TYPE: Record<string, NotificationVisual> = {
  support_reply: { label: "Réponse du support", icon: MessageCircle, tone: "bg-sky-50 text-sky-600" },
  contact: { label: "Message", icon: MessageCircle, tone: "bg-sky-50 text-sky-600" },
  payment: { label: "Paiement", icon: CreditCard, tone: "bg-emerald-50 text-succes" },
  cbc_plan: { label: "Abonnement", icon: Crown, tone: "bg-orange-50 text-orange-500" },
};

const BY_KIND: Record<string, NotificationVisual> = {
  cv: { label: "CV", icon: FileText, tone: "bg-indigo-clair text-principale" },
  analyse: { label: "Analyse IA", icon: Sparkles, tone: "bg-[#EDE9FE] text-indigo" },
  emploi: { label: "Emploi", icon: Briefcase, tone: "bg-amber-50 text-amber-600" },
  document: { label: "Documents", icon: FolderOpen, tone: "bg-teal-50 text-teal-600" },
  plan: { label: "Abonnement", icon: Crown, tone: "bg-orange-50 text-orange-500" },
  systeme: { label: "Information", icon: Info, tone: "bg-slate-100 text-navy/70" },
};

function notificationVisual(item: AppNotification): NotificationVisual {
  return BY_TYPE[item.type] ?? BY_KIND[item.kind] ?? BY_KIND.systeme;
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { relative: "", exact: "" };
  return {
    relative: formatDistanceToNow(date, { addSuffix: true, locale: fr }),
    exact: format(date, "HH:mm, dd/MM/yyyy"),
  };
}

export function NotificationPanel({
  className,
  onClose,
  ...props
}: NotificationPanelProps) {
  const unreadNotifications = useNotificationStore((s) => s.unreadNotifications);
  const readNotifications = useNotificationStore((s) => s.readNotifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const deleteAllReadNotifications = useNotificationStore((s) => s.deleteAllReadNotifications);
  const router = useRouter();
  const [tab, setTab] = useState("unread");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const unreadCount = unreadNotifications.length;

  async function onClickItem(item: AppNotification) {
    onClose?.();
    if (!item.is_read) await markAsRead(item.id);
    const href = notificationHref(item);
    if (href) router.push(href);
  }

  async function confirmDelete() {
    try {
      if (toDelete) {
        await deleteNotification(toDelete);
        toast({ title: "Notification supprimée", variant: "success" });
      } else {
        await deleteAllReadNotifications();
        toast({ title: "Notifications lues supprimées", variant: "success" });
      }
    } finally {
      setToDelete(null);
      setDeleteOpen(false);
    }
  }

  const tabClass =
    "flex-1 gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-navy/55 data-[state=active]:bg-white data-[state=active]:text-principale data-[state=active]:shadow-[0_1px_3px_rgba(15,23,42,0.08)]";

  return (
    <div className={cn("flex w-full flex-col bg-white", className)} {...props}>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-principale to-indigo text-white shadow-brand">
            <Bell className="h-[1.1rem] w-[1.1rem]" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight text-navy">Notifications</p>
            <p className="mt-0.5 text-xs text-navy/50">
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : "Vous êtes à jour"}
            </p>
          </div>
        </div>
        {tab === "unread" && unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-principale hover:bg-indigo-clair hover:text-principale"
            onClick={() => {
              void markAllAsRead().then(() => {
                toast({ title: "Tout marqué comme lu", variant: "success" });
              });
            }}
          >
            <CheckCheck className="h-4 w-4" />
            Tout lire
          </Button>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col">
        <div className="px-4 pb-2">
          <TabsList className="flex h-auto w-full rounded-xl bg-[#F1F5F9] p-1">
            <TabsTrigger value="unread" className={tabClass}>
              Non lues
              <CountPill value={unreadCount} active={tab === "unread"} />
            </TabsTrigger>
            <TabsTrigger value="read" className={tabClass}>
              Lues
              <CountPill value={readNotifications.length} active={tab === "read"} />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="unread" className="mt-0">
          <div className="nogalix-scrollbar max-h-[min(26rem,58dvh)] overflow-y-auto">
            <NotificationList isRead={false} items={unreadNotifications} onItemClick={onClickItem} />
          </div>
        </TabsContent>
        <TabsContent value="read" className="mt-0">
          <div className="nogalix-scrollbar max-h-[min(26rem,58dvh)] overflow-y-auto">
            <NotificationList
              isRead
              items={readNotifications}
              onItemClick={onClickItem}
              onDeleteClick={(id) => {
                setToDelete(id);
                setDeleteOpen(true);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {tab === "read" && readNotifications.length > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-gris/70 bg-[#F8FAFC] px-4 py-2.5">
          <p className="text-[11px] leading-snug text-navy/45">Les notifications lues se nettoient manuellement.</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-destructive hover:bg-red-50 hover:text-destructive"
            onClick={() => {
              setToDelete(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Tout supprimer
          </Button>
        </div>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? "Êtes-vous sûr de vouloir supprimer cette notification ?"
                : "Êtes-vous sûr de vouloir supprimer toutes les notifications lues ?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CountPill({ value, active }: { value: number; active: boolean }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
        active ? "bg-principale text-white" : "bg-navy/10 text-navy/60",
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

function NotificationList({
  isRead,
  items,
  onItemClick,
  onDeleteClick,
}: {
  isRead: boolean;
  items: AppNotification[];
  onItemClick: (item: AppNotification) => void;
  onDeleteClick?: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 pb-8 pt-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F9] text-navy/35">
          {isRead ? <BellOff className="h-6 w-6" /> : <CheckCheck className="h-6 w-6" />}
        </span>
        <p className="mt-3 text-sm font-semibold text-navy">
          {isRead ? "Aucune notification lue" : "Aucune notification non lue"}
        </p>
        <p className="mt-1 text-xs text-navy/50">
          {isRead ? "Les notifications consultées apparaîtront ici." : "Vous êtes à jour, rien de nouveau pour l'instant."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1 px-2 pb-2">
      {items.map((item) => {
        const visual = notificationVisual(item);
        const Icon = visual.icon;
        const date = relativeDate(isRead ? item.read_at || item.created_at : item.created_at);
        return (
          <li
            key={item.id}
            className={cn(
              "group relative flex items-start gap-1 rounded-xl transition-colors duration-brand ease-brand",
              isRead ? "hover:bg-[#F8FAFC]" : "bg-indigo-clair/45 hover:bg-indigo-clair/70",
            )}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-principale/40"
              onClick={() => onItemClick(item)}
            >
              <span className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", visual.tone)}>
                <Icon className="h-[1.05rem] w-[1.05rem]" />
                {!isRead ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-principale ring-2 ring-white"
                    aria-label="Non lue"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-[13px] font-semibold",
                      isRead ? "text-navy/70" : "text-navy",
                    )}
                  >
                    {visual.label}
                  </span>
                  <time
                    className="shrink-0 text-[11px] text-navy/40"
                    dateTime={isRead ? item.read_at || item.created_at : item.created_at}
                    title={isRead ? `Lu à ${date.exact}` : `Créée le ${date.exact}`}
                  >
                    {date.relative}
                  </time>
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-3 text-[13px] leading-snug",
                    isRead ? "text-navy/50" : "text-navy/70",
                  )}
                >
                  {item.message}
                </span>
              </span>
            </button>
            {isRead && onDeleteClick ? (
              <button
                type="button"
                className="mr-2 mt-2.5 shrink-0 rounded-lg p-1.5 text-navy/30 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Supprimer la notification ${visual.label}`}
                onClick={() => onDeleteClick(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
