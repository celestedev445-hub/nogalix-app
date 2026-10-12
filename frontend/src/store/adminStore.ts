import { create } from "zustand";
import type {
  AdminCv,
  AdminListMeta,
  AdminMessage,
  AdminMessageStatus,
  AdminPayment,
  AdminPaymentStatus,
  AdminStats,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
} from "@/lib/demoAdmin";
import {
  assignAdminUserPlan,
  deleteAdminCv,
  deleteAdminMessage,
  deleteAdminUser,
  getAdminStats,
  listAdminCvs,
  listAdminMessages,
  listAdminPayments,
  listAdminUsers,
  markAllAdminMessagesRead,
  updateAdminMessageStatus,
  updateAdminUser,
} from "@/services/admin";
import { listAdminPlans, type Plan } from "@/services/plans";
import { toast } from "@/hooks/use-toast";

export type { AdminStats };

export type UsersFilters = { q: string; status?: AdminUserStatus };
export type CvsFilters = { q: string };
export type MessagesFilters = { q: string; status?: AdminMessageStatus };
export type PaymentsFilters = { q: string; status?: AdminPaymentStatus };

export const ADMIN_PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PER_PAGE = 25;
const USERS_PER_PAGE = DEFAULT_PER_PAGE;
const CVS_PER_PAGE = DEFAULT_PER_PAGE;
const MESSAGES_PER_PAGE = DEFAULT_PER_PAGE;
const PAYMENTS_PER_PAGE = DEFAULT_PER_PAGE;

export type ListLoadOptions = { silent?: boolean; page?: number; perPage?: number };

/** Nouveau filtre → page 1 ; sinon on reste sur la page courante. */
function resolvePage(
  meta: AdminListMeta,
  filters: object | undefined,
  options: ListLoadOptions | undefined,
) {
  const perPage = options?.perPage ?? meta.per_page;
  const page = options?.perPage ? 1 : options?.page ?? (filters ? 1 : meta.page);
  return { page: Math.max(1, page), perPage };
}

/** Page vide après une suppression → on recule d'une page. */
function lastValidPage(total: number, perPage: number) {
  return Math.max(1, Math.ceil(total / perPage));
}

const emptyMeta = (perPage: number): AdminListMeta => ({ total: 0, page: 1, per_page: perPage });

function errorMessage(error: unknown, fallback = "Réessayez dans un instant.") {
  return error instanceof Error && error.message ? error.message : fallback;
}

function failToast(title: string, error: unknown) {
  toast({ title, description: errorMessage(error), variant: "destructive" });
}

/** Ignore les réponses obsolètes quand plusieurs recherches se chevauchent. */
const requestSeq: Record<string, number> = {};
function nextSeq(key: string) {
  requestSeq[key] = (requestSeq[key] ?? 0) + 1;
  return requestSeq[key];
}
function isLatest(key: string, seq: number) {
  return requestSeq[key] === seq;
}

type AdminState = {
  stats: AdminStats | null;
  statsLoading: boolean;
  statsError: string | null;

  users: AdminUser[];
  usersMeta: AdminListMeta;
  usersFilters: UsersFilters;
  usersLoading: boolean;
  usersError: string | null;

  cvs: AdminCv[];
  cvsMeta: AdminListMeta;
  cvsFilters: CvsFilters;
  cvsLoading: boolean;
  cvsError: string | null;

  messages: AdminMessage[];
  messagesMeta: AdminListMeta;
  messagesFilters: MessagesFilters;
  messagesLoading: boolean;
  messagesError: string | null;

  payments: AdminPayment[];
  paymentsMeta: AdminListMeta;
  paymentsFilters: PaymentsFilters;
  paymentsLoading: boolean;
  paymentsError: string | null;

  recentPayments: AdminPayment[];
  recentPaymentsLoading: boolean;
  recentPaymentsError: string | null;

  plans: Plan[];
  plansLoading: boolean;

  loadStats: () => Promise<void>;

  loadUsers: (filters?: Partial<UsersFilters>, options?: ListLoadOptions) => Promise<void>;
  setUserStatus: (id: string, status: AdminUserStatus) => Promise<boolean>;
  setUserRole: (id: string, role: AdminUserRole) => Promise<boolean>;
  assignUserPlan: (id: string, planId: number) => Promise<boolean>;
  removeUser: (id: string) => Promise<boolean>;

  loadCvs: (filters?: Partial<CvsFilters>, options?: ListLoadOptions) => Promise<void>;
  removeCv: (id: string) => Promise<boolean>;

  loadMessages: (filters?: Partial<MessagesFilters>, options?: ListLoadOptions) => Promise<void>;
  setMessageStatus: (
    id: string,
    status: AdminMessageStatus,
    options?: { silent?: boolean },
  ) => Promise<boolean>;
  markAllMessagesRead: () => Promise<boolean>;
  removeMessage: (id: string) => Promise<boolean>;

  loadPayments: (filters?: Partial<PaymentsFilters>, options?: ListLoadOptions) => Promise<void>;
  loadRecentPayments: () => Promise<void>;

  loadPlans: () => Promise<void>;
};

export const useAdminStore = create<AdminState>()((set, get) => ({
  stats: null,
  statsLoading: false,
  statsError: null,

  users: [],
  usersMeta: emptyMeta(USERS_PER_PAGE),
  usersFilters: { q: "" },
  usersLoading: false,
  usersError: null,

  cvs: [],
  cvsMeta: emptyMeta(CVS_PER_PAGE),
  cvsFilters: { q: "" },
  cvsLoading: false,
  cvsError: null,

  messages: [],
  messagesMeta: emptyMeta(MESSAGES_PER_PAGE),
  messagesFilters: { q: "" },
  messagesLoading: false,
  messagesError: null,

  payments: [],
  paymentsMeta: emptyMeta(PAYMENTS_PER_PAGE),
  paymentsFilters: { q: "" },
  paymentsLoading: false,
  paymentsError: null,

  recentPayments: [],
  recentPaymentsLoading: false,
  recentPaymentsError: null,

  plans: [],
  plansLoading: false,

  /* Statistiques */

  loadStats: async () => {
    const seq = nextSeq("stats");
    set({ statsLoading: true, statsError: null });
    try {
      const stats = await getAdminStats();
      if (!isLatest("stats", seq)) return;
      set({ stats, statsLoading: false });
    } catch (error) {
      if (!isLatest("stats", seq)) return;
      set({ statsLoading: false, statsError: errorMessage(error) });
    }
  },

  /* Utilisateurs */

  loadUsers: async (filters, options) => {
    const next = { ...get().usersFilters, ...filters };
    const { page, perPage } = resolvePage(get().usersMeta, filters, options);
    const seq = nextSeq("users");
    set({
      usersFilters: next,
      usersError: null,
      ...(options?.silent ? {} : { usersLoading: true }),
    });
    try {
      const { items, meta } = await listAdminUsers({
        q: next.q.trim(),
        status: next.status,
        page,
        per_page: perPage,
      });
      if (!isLatest("users", seq)) return;
      const maxPage = lastValidPage(meta.total, perPage);
      if (items.length === 0 && page > maxPage) {
        set({ usersLoading: false });
        return get().loadUsers(undefined, { ...options, page: maxPage, perPage });
      }
      set({ users: items, usersMeta: { ...meta, page, per_page: perPage }, usersLoading: false });
    } catch (error) {
      if (!isLatest("users", seq)) return;
      set({ usersLoading: false, usersError: errorMessage(error) });
    }
  },


  setUserStatus: async (id, status) => {
    const user = get().users.find((item) => item.id === id);
    if (!user || user.status === status) return false;
    try {
      const updated = await updateAdminUser(id, { status });
      set({
        users: get().users.map((item) =>
          item.id === id ? { ...item, ...(updated ?? {}), status } : item,
        ),
      });
      toast({
        title: status === "active" ? "Compte réactivé" : "Compte désactivé",
        description: user.name,
        variant: "success",
      });
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Modification impossible", error);
      return false;
    }
  },

  setUserRole: async (id, role) => {
    const user = get().users.find((item) => item.id === id);
    if (!user || user.role === role) return false;
    try {
      const updated = await updateAdminUser(id, { role });
      set({
        users: get().users.map((item) =>
          item.id === id ? { ...item, ...(updated ?? {}), role } : item,
        ),
      });
      toast({
        title: role === "admin" ? "Droits administrateur accordés" : "Droits administrateur retirés",
        description: user.name,
        variant: "success",
      });
      return true;
    } catch (error) {
      failToast("Modification impossible", error);
      return false;
    }
  },

  assignUserPlan: async (id, planId) => {
    const user = get().users.find((item) => item.id === id);
    if (!user) return false;
    const plan = get().plans.find((item) => item.id === planId);
    try {
      await assignAdminUserPlan(id, planId);
      set({
        users: get().users.map((item) =>
          item.id === id
            ? {
                ...item,
                planId,
                plan: plan?.name ?? item.plan,
                planSlug: plan?.slug ?? item.planSlug,
              }
            : item,
        ),
      });
      toast({
        title: "Plan assigné",
        description: `${user.name} · ${plan?.name ?? "nouveau plan"}`,
        variant: "success",
      });
      // Recharge silencieusement pour récupérer l'échéance calculée par le serveur.
      void get().loadUsers(undefined, { silent: true });
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Attribution impossible", error);
      return false;
    }
  },

  removeUser: async (id) => {
    const user = get().users.find((item) => item.id === id);
    if (!user) return false;
    try {
      await deleteAdminUser(id);
      set({
        users: get().users.filter((item) => item.id !== id),
        usersMeta: { ...get().usersMeta, total: Math.max(0, get().usersMeta.total - 1) },
        cvs: get().cvs.filter(
          (cv) => cv.ownerEmail.toLowerCase() !== user.email.toLowerCase(),
        ),
      });
      void get().loadUsers(undefined, { silent: true });
      toast({
        title: "Utilisateur supprimé",
        description: `${user.name} et ses CV associés ont été retirés.`,
        variant: "success",
      });
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Suppression impossible", error);
      return false;
    }
  },

  /* CV */

  loadCvs: async (filters, options) => {
    const next = { ...get().cvsFilters, ...filters };
    const { page, perPage } = resolvePage(get().cvsMeta, filters, options);
    const seq = nextSeq("cvs");
    set({
      cvsFilters: next,
      cvsError: null,
      ...(options?.silent ? {} : { cvsLoading: true }),
    });
    try {
      const { items, meta } = await listAdminCvs({
        q: next.q.trim(),
        page,
        per_page: perPage,
      });
      if (!isLatest("cvs", seq)) return;
      const maxPage = lastValidPage(meta.total, perPage);
      if (items.length === 0 && page > maxPage) {
        set({ cvsLoading: false });
        return get().loadCvs(undefined, { ...options, page: maxPage, perPage });
      }
      set({ cvs: items, cvsMeta: { ...meta, page, per_page: perPage }, cvsLoading: false });
    } catch (error) {
      if (!isLatest("cvs", seq)) return;
      set({ cvsLoading: false, cvsError: errorMessage(error) });
    }
  },


  removeCv: async (id) => {
    const cv = get().cvs.find((item) => item.id === id);
    if (!cv) return false;
    try {
      await deleteAdminCv(id);
      set({
        cvs: get().cvs.filter((item) => item.id !== id),
        cvsMeta: { ...get().cvsMeta, total: Math.max(0, get().cvsMeta.total - 1) },
      });
      void get().loadCvs(undefined, { silent: true });
      toast({ title: "CV supprimé", description: cv.title, variant: "success" });
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Suppression impossible", error);
      return false;
    }
  },

  /* Messages */

  loadMessages: async (filters, options) => {
    const next = { ...get().messagesFilters, ...filters };
    const { page, perPage } = resolvePage(get().messagesMeta, filters, options);
    const seq = nextSeq("messages");
    set({
      messagesFilters: next,
      messagesError: null,
      ...(options?.silent ? {} : { messagesLoading: true }),
    });
    try {
      const { items, meta } = await listAdminMessages({
        q: next.q.trim(),
        status: next.status,
        page,
        per_page: perPage,
      });
      if (!isLatest("messages", seq)) return;
      const maxPage = lastValidPage(meta.total, perPage);
      if (items.length === 0 && page > maxPage) {
        set({ messagesLoading: false });
        return get().loadMessages(undefined, { ...options, page: maxPage, perPage });
      }
      set({ messages: items, messagesMeta: { ...meta, page, per_page: perPage }, messagesLoading: false });
    } catch (error) {
      if (!isLatest("messages", seq)) return;
      set({ messagesLoading: false, messagesError: errorMessage(error) });
    }
  },

  setMessageStatus: async (id, status, options) => {
    const msg = get().messages.find((item) => item.id === id);
    if (!msg || msg.status === status) return false;
    try {
      await updateAdminMessageStatus(id, status);
      const filter = get().messagesFilters.status;
      set({
        messages: get()
          .messages.map((item) => (item.id === id ? { ...item, status } : item))
          .filter((item) => !filter || item.status === filter),
      });
      if (filter && filter !== status) void get().loadMessages(undefined, { silent: true });
      if (!options?.silent) {
        const titles: Record<AdminMessageStatus, string> = {
          nouveau: "Message marqué comme nouveau",
          lu: "Message marqué comme lu",
          répondu: "Message marqué comme répondu",
        };
        toast({ title: titles[status], variant: "success" });
      }
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Modification impossible", error);
      return false;
    }
  },

  markAllMessagesRead: async () => {
    try {
      const payload = (await markAllAdminMessagesRead()) as { data?: { updated?: number } };
      const updated = Number(payload?.data?.updated ?? 0);
      if (updated === 0) {
        toast({ title: "Rien à faire", description: "Aucun nouveau message.", variant: "default" });
      } else {
        toast({
          title: "Messages marqués comme lus",
          description: `${updated} message${updated > 1 ? "s" : ""}.`,
          variant: "success",
        });
      }
      await get().loadMessages();
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Action impossible", error);
      return false;
    }
  },

  removeMessage: async (id) => {
    const msg = get().messages.find((item) => item.id === id);
    if (!msg) return false;
    try {
      await deleteAdminMessage(id);
      set({
        messages: get().messages.filter((item) => item.id !== id),
        messagesMeta: {
          ...get().messagesMeta,
          total: Math.max(0, get().messagesMeta.total - 1),
        },
      });
      void get().loadMessages(undefined, { silent: true });
      toast({ title: "Message supprimé", description: msg.subject, variant: "success" });
      void get().loadStats();
      return true;
    } catch (error) {
      failToast("Suppression impossible", error);
      return false;
    }
  },

  /* Paiements */

  loadPayments: async (filters, options) => {
    const next = { ...get().paymentsFilters, ...filters };
    const { page, perPage } = resolvePage(get().paymentsMeta, filters, options);
    const seq = nextSeq("payments");
    set({
      paymentsFilters: next,
      paymentsError: null,
      ...(options?.silent ? {} : { paymentsLoading: true }),
    });
    try {
      const { items, meta } = await listAdminPayments({
        q: next.q.trim(),
        status: next.status,
        page,
        per_page: perPage,
      });
      if (!isLatest("payments", seq)) return;
      const maxPage = lastValidPage(meta.total, perPage);
      if (items.length === 0 && page > maxPage) {
        set({ paymentsLoading: false });
        return get().loadPayments(undefined, { ...options, page: maxPage, perPage });
      }
      set({ payments: items, paymentsMeta: { ...meta, page, per_page: perPage }, paymentsLoading: false });
    } catch (error) {
      if (!isLatest("payments", seq)) return;
      set({ paymentsLoading: false, paymentsError: errorMessage(error) });
    }
  },


  loadRecentPayments: async () => {
    const seq = nextSeq("recentPayments");
    set({ recentPaymentsLoading: true, recentPaymentsError: null });
    try {
      const { items } = await listAdminPayments({ page: 1, per_page: 5 });
      if (!isLatest("recentPayments", seq)) return;
      set({ recentPayments: items, recentPaymentsLoading: false });
    } catch (error) {
      if (!isLatest("recentPayments", seq)) return;
      set({ recentPaymentsLoading: false, recentPaymentsError: errorMessage(error) });
    }
  },

  /* Plans (pour l'attribution) */

  loadPlans: async () => {
    if (get().plansLoading) return;
    set({ plansLoading: true });
    try {
      const plans = await listAdminPlans();
      set({ plans: [...plans].sort((a, b) => a.level - b.level || a.price - b.price) });
    } catch (error) {
      failToast("Impossible de charger les plans", error);
    } finally {
      set({ plansLoading: false });
    }
  },
}));
