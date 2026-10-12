import { useState } from "react";
import { useRouter } from "@/platform/navigation";
import { format } from "date-fns";
import { Bell, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function avatarColor(name: string) {
  const palette = [
    "bg-indigo-clair text-principale",
    "bg-[#EDE9FE] text-indigo",
    "bg-emerald-50 text-succes",
    "bg-orange-50 text-orange-500",
  ];
  return palette[(name.charCodeAt(0) ?? 0) % palette.length];
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

  return (
    <Card className={cn("w-[min(380px,calc(100vw-1.5rem))] border-none bg-white shadow-none", className)} {...props}>
      <CardHeader className="border-b border-gris p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-clair text-principale">
              <Bell className="h-4 w-4" />
            </span>
            <CardTitle className="font-display text-base">Notifications</CardTitle>
          </div>
          {unreadNotifications.length > 0 ? (
            <Badge className="rounded-full border-none bg-indigo-clair text-principale">
              {unreadNotifications.length}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <CardContent className="grid gap-1 p-0">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none bg-[#F8FAFC] p-1">
            <TabsTrigger
              value="unread"
              className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-principale"
            >
              <EyeOff className="h-4 w-4" />
              Non lues
            </TabsTrigger>
            <TabsTrigger
              value="read"
              className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-principale"
            >
              <Eye className="h-4 w-4" />
              Lues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-[min(400px,55dvh)]">
              <NotificationList
                isRead={false}
                items={unreadNotifications}
                onItemClick={onClickItem}
              />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="read" className="mt-0">
            <ScrollArea className="h-[min(400px,55dvh)]">
              <CardDescription className="px-4 pt-3 text-xs text-navy/50">
                Les notifications lues peuvent être nettoyées manuellement.
              </CardDescription>
              <NotificationList
                isRead
                items={readNotifications}
                onItemClick={onClickItem}
                onDeleteClick={(id) => {
                  setToDelete(id);
                  setDeleteOpen(true);
                }}
              />
            </ScrollArea>
          </TabsContent>
        </CardContent>
      </Tabs>

      {tab === "unread" && unreadNotifications.length > 0 ? (
        <CardFooter className="border-t border-gris p-4">
          <Button
            className="w-full rounded-xl"
            onClick={() => {
              void markAllAsRead().then(() => {
                toast({ title: "Tout marqué comme lu", variant: "success" });
              });
            }}
          >
            <Check />
            Marquer tout comme lu
          </Button>
        </CardFooter>
      ) : null}
      {tab === "read" && readNotifications.length > 0 ? (
        <CardFooter className="border-t border-gris p-4">
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={() => {
              setToDelete(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 />
            Supprimer tout
          </Button>
        </CardFooter>
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
    </Card>
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
      <div className="flex flex-col items-center justify-center px-4 py-10 text-navy/45">
        <Bell className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">Aucune notification {isRead ? "lue" : "non lue"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors duration-brand ease-brand hover:bg-[#F8FAFC]"
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={() => onItemClick(item)}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                avatarColor(item.actor || item.type),
              )}
            >
              {(item.actor || item.type)[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-navy">{item.type}</span>
              <span className="mt-1 block text-sm text-navy/60">{item.message}</span>
              <span className="mt-2 flex items-center gap-2 text-xs text-navy/45">
                {isRead
                  ? `Lu à ${format(new Date(item.read_at || item.created_at), "HH:mm, dd/MM/yyyy")}`
                  : `Créée le ${format(new Date(item.created_at), "HH:mm, dd/MM/yyyy")}`}
                {!isRead ? <span className="h-2 w-2 rounded-full bg-principale" /> : null}
              </span>
            </span>
          </button>
          {isRead && onDeleteClick ? (
            <button
              type="button"
              className="shrink-0 rounded-full p-1 text-navy/30 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              aria-label={`Supprimer la notification ${item.type}`}
              onClick={() => onDeleteClick(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
