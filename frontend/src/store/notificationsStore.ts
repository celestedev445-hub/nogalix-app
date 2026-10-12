import { create } from "zustand";
import type { AppNotification } from "@/lib/notificationTypes";
import {
  deleteNotifications,
  getNotifications,
  markNotificationsRead,
} from "@/services/notifications";

const REFRESH_MS = 60_000;

function unwrap(payload: unknown): { unread: AppNotification[]; read: AppNotification[] } | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as {
    unread_notifications?: AppNotification[];
    read_notifications?: AppNotification[];
  };
  if (!Array.isArray(data.unread_notifications) && !Array.isArray(data.read_notifications)) {
    return null;
  }
  return {
    unread: data.unread_notifications ?? [],
    read: data.read_notifications ?? [],
  };
}

type NotificationState = {
  unreadNotifications: AppNotification[];
  readNotifications: AppNotification[];
  lastFetchedAt: number;
  fetchNotifications: (force?: boolean) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllReadNotifications: () => Promise<void>;
  reset: () => void;
};

let fetchInflight: Promise<void> | null = null;

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  unreadNotifications: [],
  readNotifications: [],
  lastFetchedAt: 0,
  reset: () => set({ unreadNotifications: [], readNotifications: [], lastFetchedAt: 0 }),

  fetchNotifications: async (force = false) => {
    const { lastFetchedAt } = get();
    if (!force && lastFetchedAt && Date.now() - lastFetchedAt < REFRESH_MS) return;
    if (fetchInflight) return fetchInflight;

    fetchInflight = (async () => {
      try {
        const payload = await getNotifications();
        const lists = unwrap(payload);
        if (lists) {
          set({
            unreadNotifications: lists.unread,
            readNotifications: lists.read,
            lastFetchedAt: Date.now(),
          });
          return;
        }
      } catch {
        /* API indisponible */
      }
      set({ unreadNotifications: [], readNotifications: [], lastFetchedAt: Date.now() });
    })();

    try {
      await fetchInflight;
    } finally {
      fetchInflight = null;
    }
  },

  markAsRead: async (id) => {
    const current = get().unreadNotifications.find((item) => item.id === id);
    if (!current) return;
    const next = { ...current, is_read: true, read_at: new Date().toISOString() };
    set({
      unreadNotifications: get().unreadNotifications.filter((item) => item.id !== id),
      readNotifications: [next, ...get().readNotifications],
    });
    try {
      await markNotificationsRead([id]);
    } catch {
      /* affichage optimiste */
    }
  },

  markAllAsRead: async () => {
    const ids = get().unreadNotifications.map((item) => item.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    set({
      readNotifications: [
        ...get().unreadNotifications.map((item) => ({ ...item, is_read: true, read_at: now })),
        ...get().readNotifications,
      ],
      unreadNotifications: [],
    });
    try {
      await markNotificationsRead(ids);
    } catch {
      /* affichage optimiste */
    }
  },

  deleteNotification: async (id) => {
    const unreadSnapshot = get().unreadNotifications;
    const readSnapshot = get().readNotifications;
    set({
      unreadNotifications: unreadSnapshot.filter((item) => item.id !== id),
      readNotifications: readSnapshot.filter((item) => item.id !== id),
    });
    try {
      await deleteNotifications([id]);
    } catch {
      set({ unreadNotifications: unreadSnapshot, readNotifications: readSnapshot });
    }
  },

  deleteAllReadNotifications: async () => {
    const ids = get().readNotifications.map((item) => item.id);
    const readSnapshot = get().readNotifications;
    set({ readNotifications: [] });
    try {
      await deleteNotifications(ids);
    } catch {
      set({ readNotifications: readSnapshot });
    }
  },
}));
