import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPanel } from "@/components/features/notifications";
import { useNotificationStore } from "@/store/notificationsStore";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useNotificationStore((s) => s.unreadNotifications.length);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className={cn("relative h-10 w-10 rounded-xl", open && "bg-indigo-clair")}
        >
          <Bell className={cn("h-[1.15rem] w-[1.15rem]", open && "text-principale")} />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-principale px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-[min(380px,calc(100vw-1rem))] overflow-hidden rounded-2xl border-gris/80 p-0 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]",
        )}
      >
        <NotificationPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
