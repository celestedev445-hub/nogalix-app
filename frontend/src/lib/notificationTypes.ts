export type NotificationKind = "cv" | "analyse" | "emploi" | "document" | "plan" | "systeme";

export type AppNotification = {
  id: string;
  type: string;
  kind: NotificationKind;
  message: string;
  href?: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: string;
};

export function notificationHref(item: AppNotification) {
  if (item.href) return item.href;
  if (item.type === "support_reply") return "/support";
  switch (item.kind) {
    case "cv":
      return "/cv";
    case "analyse":
      return "/analyse";
    case "emploi":
      return "/emploi";
    case "document":
      return "/documents";
    case "plan":
      return "/plans";
    default:
      return "/dashboard";
  }
}
