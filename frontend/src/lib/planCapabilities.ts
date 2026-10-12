import type { AuthUser } from "@/store/authStore";
import type { CapabilityEntry } from "@/services/plans";

export function getCapabilities(user: AuthUser | null | undefined): Record<string, CapabilityEntry> {
  const caps = user?.capabilities;
  if (caps && typeof caps === "object") return caps as Record<string, CapabilityEntry>;
  return {};
}

export function canUseCapability(user: AuthUser | null | undefined, key: string) {
  const caps = getCapabilities(user);
  const entry = caps[key];
  if (!entry) {
    if (Object.keys(caps).length > 0) return false;
    return import.meta.env.DEV;
  }
  return Boolean(entry.allowed);
}

export function capabilityLimit(user: AuthUser | null | undefined, key: string) {
  const caps = getCapabilities(user);
  const entry = caps[key];
  if (!entry) {
    if (Object.keys(caps).length > 0) return 0;
    return null;
  }
  if (entry.unlimited) return -1;
  return entry.value;
}

export function aiTrialsRemaining(user: AuthUser | null | undefined) {
  const entry = getCapabilities(user)["ai.trials"];
  if (!entry) {
    if (Object.keys(getCapabilities(user)).length > 0) return 0;
    return import.meta.env.DEV ? -1 : 0;
  }
  if (entry.unlimited) return -1;
  if (typeof entry.remaining === "number") return entry.remaining;
  return Math.max(0, Number(entry.value || 0) - Number(entry.used || 0));
}

export function canUseAi(user: AuthUser | null | undefined) {
  const remaining = aiTrialsRemaining(user);
  return remaining === -1 || remaining > 0;
}

export function aiTrialsHint(user: AuthUser | null | undefined) {
  const remaining = aiTrialsRemaining(user);
  if (remaining === -1) return null;
  const period = getCapabilities(user)["ai.trials"]?.period;
  const monthly = Boolean(period && period !== "lifetime");
  if (remaining <= 0) {
    return monthly
      ? "Quota IA du mois atteint. Passez Premium pour un usage illimité."
      : "3 essais IA utilisés. Passez Pro pour 30 actions par mois.";
  }
  return monthly
    ? `${remaining} action${remaining > 1 ? "s" : ""} IA restante${remaining > 1 ? "s" : ""} ce mois`
    : `${remaining} essai${remaining > 1 ? "s" : ""} IA restant${remaining > 1 ? "s" : ""}`;
}

export function planName(user: AuthUser | null | undefined) {
  const plan = user?.plan as { name?: string; slug?: string } | undefined;
  return plan?.name || "Gratuit";
}

export async function syncPlanCapabilities() {
  const { useAuthStore } = await import("@/store/authStore");
  const user = useAuthStore.getState().user;
  if (!user) return;
  const { getMyPlan } = await import("@/services/plans");
  try {
    const payload = await getMyPlan();
    const caps = payload.data?.capabilities;
    if (!caps) return;
    useAuthStore.getState().setUser({
      ...user,
      capabilities: caps,
      plan: payload.data?.plan ?? user.plan,
    });
  } catch {
    /* ignore */
  }
}
