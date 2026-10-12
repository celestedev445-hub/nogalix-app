import { makeRequest } from "@/lib/makeRequest";
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

export type AdminPage<T> = { items: T[]; meta: AdminListMeta };

type Envelope<T> = { data?: T; meta?: Partial<AdminListMeta>; message?: string };

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function unwrapPage<T>(payload: unknown, fallbackPerPage: number): AdminPage<T> {
  const body = (payload ?? {}) as Envelope<T[]>;
  const items = Array.isArray(body.data) ? body.data : Array.isArray(payload) ? (payload as T[]) : [];
  return {
    items,
    meta: {
      total: Number(body.meta?.total ?? items.length),
      page: Number(body.meta?.page ?? 1),
      per_page: Number(body.meta?.per_page ?? fallbackPerPage),
    },
  };
}

function unwrapData<T>(payload: unknown): T {
  return ((payload ?? {}) as Envelope<T>).data as T;
}

export type AdminListParams = {
  q?: string;
  page?: number;
  per_page?: number;
};

/* Statistiques */

export async function getAdminStats() {
  const payload = await makeRequest("admin/stats", "GET", null, true, false);
  return unwrapData<AdminStats>(payload);
}

/* Utilisateurs */

export async function listAdminUsers(params: AdminListParams & { status?: AdminUserStatus } = {}) {
  const perPage = params.per_page ?? 50;
  const payload = await makeRequest(
    `admin/users${buildQuery({ ...params, per_page: perPage })}`,
    "GET",
    null,
    true,
    false,
  );
  return unwrapPage<AdminUser>(payload, perPage);
}

export async function updateAdminUser(
  id: string,
  body: { status?: AdminUserStatus; role?: AdminUserRole },
) {
  const payload = await makeRequest(`admin/users/${id}`, "PATCH", body, true, false);
  return unwrapData<AdminUser>(payload);
}

export async function deleteAdminUser(id: string) {
  return makeRequest(`admin/users/${id}`, "DELETE", null, true, false);
}

export async function assignAdminUserPlan(id: string, planId: number) {
  return makeRequest(`admin/users/${id}/plan`, "POST", { plan_id: planId }, true, false);
}

/* CV */

export async function listAdminCvs(params: AdminListParams = {}) {
  const perPage = params.per_page ?? 50;
  const payload = await makeRequest(
    `admin/cvs${buildQuery({ ...params, per_page: perPage })}`,
    "GET",
    null,
    true,
    false,
  );
  return unwrapPage<AdminCv>(payload, perPage);
}

export async function deleteAdminCv(id: string) {
  return makeRequest(`admin/cvs/${id}`, "DELETE", null, true, false);
}

/* Messages */

export async function listAdminMessages(
  params: AdminListParams & { status?: AdminMessageStatus } = {},
) {
  const perPage = params.per_page ?? 100;
  const payload = await makeRequest(
    `admin/messages${buildQuery({ ...params, per_page: perPage })}`,
    "GET",
    null,
    true,
    false,
  );
  return unwrapPage<AdminMessage>(payload, perPage);
}

export async function updateAdminMessageStatus(id: string, status: AdminMessageStatus) {
  const payload = await makeRequest(`admin/messages/${id}`, "PATCH", { status }, true, false);
  return unwrapData<AdminMessage | undefined>(payload);
}

export async function markAllAdminMessagesRead() {
  return makeRequest("admin/messages/read-all", "POST", null, true, false);
}

export async function deleteAdminMessage(id: string) {
  return makeRequest(`admin/messages/${id}`, "DELETE", null, true, false);
}

/* Paiements */

export async function listAdminPayments(
  params: AdminListParams & { status?: AdminPaymentStatus } = {},
) {
  const perPage = params.per_page ?? 25;
  const payload = await makeRequest(
    `admin/payments${buildQuery({ ...params, per_page: perPage })}`,
    "GET",
    null,
    true,
    false,
  );
  return unwrapPage<AdminPayment>(payload, perPage);
}
