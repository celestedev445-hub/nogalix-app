/**
 * Types du back-office admin (données réelles issues de l'API `admin/*`).
 * Le nom du fichier est conservé pour ne pas casser les imports existants.
 */
import { parseISO } from "date-fns";
import { templatesCatalog } from "@/lib/templatesCatalog";

export type AdminUserStatus = "active" | "disabled";
export type AdminUserRole = "user" | "admin";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: AdminUserStatus;
  role: AdminUserRole;
  cvCount: number;
  createdAt: string | null;
  lastSeenAt: string | null;
  plan: string | null;
  planId: number | null;
  planSlug: string | null;
  planExpiresAt: string | null;
  hasGoogle: boolean;
};

export type AdminCv = {
  id: string;
  title: string;
  ownerName: string;
  ownerEmail: string;
  templateId: string | null;
  templateName: string;
  completion: number;
  updatedAt: string | null;
  principal: boolean;
};

export type AdminMessageStatus = "nouveau" | "lu" | "répondu";

export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  preview: string;
  createdAt: string | null;
  status: AdminMessageStatus;
};

export type AdminPaymentStatus = "pending" | "completed" | "failed" | "cancelled" | "expired";

export type AdminPayment = {
  id: number;
  reference: string;
  plan_slug: string | null;
  plan_name: string | null;
  months: number;
  amount: number;
  currency: string;
  service: "MTN" | "ORANGE" | string | null;
  phone: string | null;
  status: AdminPaymentStatus;
  failure_reason: string | null;
  paid_at: string | null;
  period_end: string | null;
  created_at: string | null;
  provider_reference: string | null;
  user: { id: number; name: string; email: string } | null;
};

export type AdminStats = {
  usersTotal: number;
  usersActive: number;
  usersNew30d: number;
  cvsTotal: number;
  cvsAvgCompletion: number;
  messagesNew: number;
  messagesTotal: number;
  plansPaid: number;
  revenueTotal: number;
  revenue30d: number;
  plans: { name: string; users: number }[];
  activity?: {
    week: AdminActivityPoint[];
    month: AdminActivityPoint[];
    semester: AdminActivityPoint[];
  };
};

export type AdminActivityPoint = {
  label: string;
  users: number;
  cvs: number;
  revenue: number;
  payments: number;
};

export type AdminListMeta = { total: number; page: number; per_page: number };

/** Les dates renvoyées par l'API sont en UTC, parfois sans suffixe de fuseau. */
export function parseAdminDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = parseISO(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Montant en FCFA avec séparateur de milliers par espaces : 51 940 FCFA. */
export function formatFcfa(amount: number | null | undefined) {
  const value = Math.round(Number(amount) || 0);
  const digits = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${value < 0 ? "-" : ""}${digits} FCFA`;
}

/** Nom lisible du modèle à partir de son identifiant. */
export function resolveTemplateName(templateId: string | null | undefined, fallback?: string) {
  if (!templateId) return fallback || "—";
  const found = templatesCatalog.find((tpl) => tpl.id === templateId);
  if (found) return found.name;
  if (templateId === "import-original") return "Document importé";
  return fallback || templateId;
}
