import { makeRequest } from "@/lib/makeRequest";

export type PlanLimitation = {
  id?: number;
  plan_id?: number;
  key: string;
  limitation_type: "boolean" | "count" | string;
  value: number;
  description?: string | null;
};

export type PlanFeature = {
  id?: number;
  plan_id?: number;
  name: string;
  description?: string | null;
  is_enabled: boolean;
  sort_order: number;
};

export type Plan = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  tagline?: string | null;
  price: number;
  priceMonthly?: number;
  duration_months: number;
  level: number;
  is_active: boolean;
  highlighted: boolean;
  popular: boolean;
  cta: string;
  limitations?: PlanLimitation[];
  features?: PlanFeature[];
  feature_names?: string[];
};

export type CapabilityEntry = {
  label: string;
  type: string;
  value: number;
  allowed: boolean;
  unlimited?: boolean;
  used?: number;
  remaining?: number;
  period?: string;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

export async function listPublicPlans() {
  const payload = await makeRequest("plans", "GET", null, false, false);
  return unwrapList<Plan>(payload);
}

export async function listAdminPlans() {
  const payload = await makeRequest("admin/plans", "GET", null, true, false);
  return unwrapList<Plan>(payload);
}

export async function getAdminPlan(id: number) {
  const payload = (await makeRequest(`admin/plans/${id}`, "GET", null, true, false)) as {
    data?: Plan;
  };
  return payload.data as Plan;
}

export async function createAdminPlan(body: Record<string, unknown>) {
  return makeRequest("admin/plans", "POST", body, true, false);
}

export async function updateAdminPlan(id: number, body: Record<string, unknown>) {
  return makeRequest(`admin/plans/${id}`, "PUT", body, true, false);
}

export async function deleteAdminPlan(id: number) {
  return makeRequest(`admin/plans/${id}`, "DELETE", null, true, false);
}

export async function upsertPlanLimitation(planId: number, body: Record<string, unknown>) {
  return makeRequest(`admin/plans/${planId}/limitations`, "POST", body, true, false);
}

export async function deletePlanLimitation(planId: number, limitationId: number) {
  return makeRequest(`admin/plans/${planId}/limitations/${limitationId}`, "DELETE", null, true, false);
}

export async function addPlanFeature(planId: number, body: Record<string, unknown>) {
  return makeRequest(`admin/plans/${planId}/features`, "POST", body, true, false);
}

export async function updatePlanFeature(planId: number, featureId: number, body: Record<string, unknown>) {
  return makeRequest(`admin/plans/${planId}/features/${featureId}`, "PUT", body, true, false);
}

export async function deletePlanFeature(planId: number, featureId: number) {
  return makeRequest(`admin/plans/${planId}/features/${featureId}`, "DELETE", null, true, false);
}

export async function getCapabilityCatalog() {
  const payload = await makeRequest("plans/catalog", "GET", null, true, false);
  return unwrapList<{ key: string; label: string }>(payload);
}

export async function getMyPlan() {
  return makeRequest("plans/me", "GET", null, true, false) as Promise<{
    data?: { plan?: { id: number; slug: string; name: string; level: number; price: number }; capabilities?: Record<string, CapabilityEntry> };
  }>;
}

export async function assignUserPlan(userId: number, planId: number) {
  return makeRequest(`admin/users/${userId}/plan`, "POST", { plan_id: planId }, true, false);
}
