import { create } from "zustand";
import { makeRequest } from "@/lib/makeRequest";

export interface SupportTicketReply {
  id: number;
  message: string;
  is_staff: boolean;
  created_at?: string;
  author?: { id: number; name: string };
}

export interface SupportTicket {
  id: number;
  code?: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  user?: { id: number; name: string; email: string };
  replies?: SupportTicketReply[];
}

export type SupportTicketFilters = {
  search?: string;
  status?: string;
  sujet?: string;
  period?: string;
  year?: string;
  month?: string;
};

interface SupportStore {
  tickets: SupportTicket[];
  ticket: SupportTicket | null;
  loading: boolean;
  error: string | null;
  loadTickets: (filters?: SupportTicketFilters) => Promise<void>;
  loadTicketById: (id: number) => Promise<void>;
  createTicket: (
    data: Omit<
      SupportTicket,
      "status" | "id" | "created_at" | "updated_at" | "user_id" | "code" | "user" | "replies"
    >,
  ) => Promise<void>;
  updateTicketStatus: (id: number, status: string) => Promise<void>;
  replyToTicket: (id: number, message: string) => Promise<SupportTicketReply>;
  deleteTicket: (id: number) => Promise<void>;
}

function buildQuery(filters?: SupportTicketFilters): string {
  const params = new URLSearchParams();
  if (filters?.search?.trim()) params.append("search", filters.search.trim());
  if (filters?.status && filters.status !== "all") params.append("status", filters.status);
  if (filters?.sujet && filters.sujet !== "all") params.append("sujet", filters.sujet);
  if (filters?.period && filters.period !== "all") params.append("period", filters.period);
  if (filters?.year && filters.year !== "all") params.append("year", filters.year);
  if (filters?.month && filters.month !== "all") params.append("month", filters.month);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const useSupportStore = create<SupportStore>((set) => ({
  tickets: [],
  ticket: null,
  loading: false,
  error: null,

  loadTickets: async (filters) => {
    set({ loading: true, error: null });
    try {
      const data = await makeRequest(`supports${buildQuery(filters)}`, "GET", null, true);
      set({ tickets: Array.isArray(data) ? (data as SupportTicket[]) : [], loading: false });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue";
      set({ error: errorMessage, loading: false });
    }
  },

  loadTicketById: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const data = (await makeRequest(`supports/${id}`, "GET", null, true)) as SupportTicket;
      set({ ticket: data, loading: false });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue";
      set({ error: errorMessage, loading: false });
    }
  },

  createTicket: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = (await makeRequest("supports", "POST", data, true)) as SupportTicket;
      set((state) => ({
        tickets: [response, ...state.tickets],
        loading: false,
      }));
    } catch {
      set({ loading: false, error: "Erreur lors de la création du ticket" });
      throw new Error("Erreur lors de la création du ticket");
    }
  },

  updateTicketStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const res = (await makeRequest(`supports/${id}`, "PUT", { status }, true)) as {
        data?: SupportTicket;
      } & SupportTicket;
      const updated = res.data ?? res;
      set((state) => ({
        tickets: state.tickets.map((ticket) => (ticket.id === id ? updated : ticket)),
        loading: false,
      }));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue";
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },

  replyToTicket: async (id, message) => {
    const reply = (await makeRequest(
      `supports/${id}/replies`,
      "POST",
      { message },
      true,
    )) as SupportTicketReply;

    set((state) => ({
      tickets: state.tickets.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const replies = [...(ticket.replies ?? []), reply];
        const nextStatus =
          reply.is_staff && ticket.status === "en attente" ? "en traitement" : ticket.status;
        return { ...ticket, replies, status: nextStatus };
      }),
    }));

    return reply;
  },

  deleteTicket: async (id) => {
    set({ loading: true, error: null });
    try {
      await makeRequest(`supports/${id}`, "DELETE", null, true);
      set((state) => ({
        tickets: state.tickets.filter((ticket) => ticket.id !== id),
        loading: false,
      }));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue";
      set({ error: errorMessage, loading: false });
      throw err;
    }
  },
}));
