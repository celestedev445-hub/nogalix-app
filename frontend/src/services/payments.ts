import { makeRequest } from "@/lib/makeRequest";
import type { MesombService } from "@/lib/mesombCountries";

export type PaymentService = MesombService;
export type PaymentStatus = "pending" | "completed" | "failed" | "cancelled" | "expired";

export type PaymentConfig = {
  enabled: boolean;
  card_enabled?: boolean;
  provider: string;
  card_provider?: string;
  currency: string;
  country: string;
  yearly_discount_percent: number;
  months: number[];
  services: { id: PaymentService; label: string }[];
};

export type Payment = {
  id: number;
  reference: string;
  plan_slug: string;
  plan_name: string;
  months: number;
  amount: number;
  currency: string;
  provider?: string;
  service: PaymentService | string;
  phone: string;
  status: PaymentStatus;
  failure_reason?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  created_at: string;
  client_secret?: string | null;
  stripe_publishable_key?: string | null;
};

export type PaymentResponse = {
  message?: string;
  data: Payment;
  user?: Record<string, unknown> | null;
};

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  enabled: false,
  card_enabled: false,
  provider: "mesomb",
  card_provider: "keypay",
  currency: "XAF",
  country: "CM",
  yearly_discount_percent: 20,
  months: [1, 12],
  services: [
    { id: "MTN", label: "MTN Mobile Money" },
    { id: "ORANGE", label: "Orange Money" },
  ],
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  completed: "Payé",
  failed: "Échoué",
  cancelled: "Annulé",
  expired: "Expiré",
};

let configCache: Promise<PaymentConfig> | null = null;

export async function getPaymentConfig(force = false): Promise<PaymentConfig> {
  if (configCache && !force) return configCache;
  configCache = (async () => {
    try {
      const payload = (await makeRequest("payments/config", "GET", null, false, false)) as {
        data?: Partial<PaymentConfig>;
      };
      return { ...DEFAULT_PAYMENT_CONFIG, ...(payload?.data || {}) };
    } catch {
      configCache = null;
      return DEFAULT_PAYMENT_CONFIG;
    }
  })();
  return configCache;
}

export async function startCheckout(body: {
  plan: string;
  phone?: string;
  service?: MesombService;
  months: number;
  method?: "CARD" | "MOBILE";
}) {
  return makeRequest("payments/checkout", "POST", body, true, false) as Promise<PaymentResponse>;
}

export async function getPayment(reference: string) {
  return makeRequest(
    `payments/${encodeURIComponent(reference)}`,
    "GET",
    null,
    true,
    false,
  ) as Promise<PaymentResponse>;
}

export async function cancelPayment(reference: string) {
  return makeRequest(
    `payments/${encodeURIComponent(reference)}/cancel`,
    "POST",
    null,
    true,
    false,
  ) as Promise<PaymentResponse>;
}

export async function listPayments(): Promise<Payment[]> {
  const payload = (await makeRequest("payments", "GET", null, true, false)) as { data?: Payment[] };
  return Array.isArray(payload?.data) ? payload.data : [];
}

/** Prix total pour une durée : annuel = prix × 12 × (1 − remise), arrondi. */
export function planPriceFor(price: number, months: number, yearlyDiscountPercent = 20) {
  if (months >= 12) return Math.round(price * 12 * (1 - yearlyDiscountPercent / 100));
  return Math.round(price * months);
}

/** Chiffres locaux camerounais (sans indicatif 237), 9 chiffres max. */
export function normalizeCameroonPhone(phone: string) {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00237")) digits = digits.slice(5);
  else if (digits.startsWith("237") && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/**
 * Opérateur selon le préfixe :
 * MTN 67x, 650-654, 680-684 · Orange 69x, 655-659, 640, 686-689.
 */
export function detectPaymentService(phone: string): PaymentService | null {
  const local = normalizeCameroonPhone(phone);
  if (local.length < 2 || !local.startsWith("6")) return null;
  const two = local.slice(0, 2);
  if (two === "67") return "MTN";
  if (two === "69") return "ORANGE";
  if (local.length < 3) return null;
  const three = Number(local.slice(0, 3));
  if (three >= 650 && three <= 654) return "MTN";
  if (three >= 655 && three <= 659) return "ORANGE";
  if (three >= 680 && three <= 684) return "MTN";
  if (three >= 686 && three <= 689) return "ORANGE";
  if (three === 640) return "ORANGE";
  return null;
}

export function formatFcfa(amount: number) {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}
