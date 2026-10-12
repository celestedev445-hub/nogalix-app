import { makeRequest } from "@/lib/makeRequest";

export async function getNotifications() {
  return makeRequest("notifications", "GET", null, true, false);
}

export async function markNotificationsRead(ids: string[]) {
  return makeRequest("notifications/markAsRead", "POST", { notification_ids: ids }, true, false);
}

export async function deleteNotifications(ids: string[]) {
  return makeRequest("notifications/delete", "POST", { notification_ids: ids }, true, false);
}
