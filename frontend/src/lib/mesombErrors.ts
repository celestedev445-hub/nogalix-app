/** Codes d'échec MeSomb (docs.mesomb.com/development/errors), comme CBC. */

const MESOMB_CODES = [
  "subscriber-insufficient-balance",
  "subscriber-not-found",
  "subscriber-internal-error",
  "subscriber-timeout",
  "subscriber-invalid-secret-code",
  "subscriber-limit-reached",
  "subscriber-invalid-min-amount",
  "subscriber-invalid-max-amount",
  "subscriber-invalid-length",
  "subscriber-withdrawal-failed",
  "provider-application-problem",
  "provider-second-number-not-found",
  "invalid-amount",
  "generic-error",
  "unknown-issue",
] as const;

const CODE_KEYS = ["code", "errorCode", "error_code", "failure_code", "failureCode"] as const;

const NESTED_KEYS = [
  "response",
  "error",
  "details",
  "detail",
  "message",
  "failure_message",
  "failureReason",
  "statusMessage",
] as const;

const FALLBACK =
  "Le paiement a été refusé par l'opérateur. Causes fréquentes : solde insuffisant, code PIN incorrect ou demande annulée sur le téléphone.";

const MESSAGES: Record<(typeof MESOMB_CODES)[number], string> = {
  "subscriber-insufficient-balance": "Solde Mobile Money insuffisant. Rechargez votre compte, puis réessayez.",
  "subscriber-not-found": "Ce numéro Mobile Money n'existe pas. Vérifiez le numéro et réessayez.",
  "subscriber-internal-error":
    "Le paiement n'a pas abouti (solde insuffisant, PIN incorrect ou délai dépassé). Vérifiez et réessayez.",
  "subscriber-timeout": "La confirmation a expiré. Réessayez et validez plus vite sur votre téléphone.",
  "subscriber-invalid-secret-code": "Code PIN incorrect. Réessayez et saisissez le bon code.",
  "subscriber-limit-reached":
    "Ce compte a atteint sa limite de transactions. Réessayez plus tard ou avec un autre numéro.",
  "subscriber-invalid-min-amount": "Le montant est inférieur au minimum autorisé par l'opérateur.",
  "subscriber-invalid-max-amount": "Le montant dépasse le maximum autorisé par l'opérateur.",
  "subscriber-invalid-length": "Le numéro de téléphone Mobile Money est invalide.",
  "subscriber-withdrawal-failed": "Le virement Mobile Money a échoué.",
  "provider-application-problem": "L'opérateur Mobile Money a rencontré un problème. Réessayez plus tard.",
  "provider-second-number-not-found": "Le numéro indiqué n'est pas un compte opérateur valide.",
  "invalid-amount": "Le montant de la transaction est invalide.",
  "generic-error": FALLBACK,
  "unknown-issue": FALLBACK,
};

export function normalizeMesombCode(code?: string | null): string | null {
  if (typeof code !== "string") return null;
  const normalized = code.trim().toLowerCase().replace(/_/g, "-");
  return MESOMB_CODES.includes(normalized as (typeof MESOMB_CODES)[number]) ? normalized : null;
}

/** Libellés qui n'expliquent pas l'échec : `message` MeSomb est souvent le nom du marchand. */
export function isGenericMesombMessage(message?: string | null): boolean {
  if (typeof message !== "string") return true;
  const hay = message.trim().toLowerCase();
  if (!hay) return true;
  if (/^by\s+/.test(hay)) return true;
  if (/^paiements?\s+échou/.test(hay)) return true;
  if (/^payment failed/.test(hay)) return true;
  return ["failed", "error", "errored", "cancelled", "canceled"].includes(hay);
}

function codeInText(text: string): string | null {
  const hay = text.toLowerCase().replace(/_/g, "-");
  return MESOMB_CODES.find((code) => hay.includes(code)) ?? null;
}

export function inferMesombCodeFromMessage(raw: string): string | null {
  const hay = raw.toLowerCase();
  if (hay.includes("insufficient") || hay.includes("insuffisant") || hay.includes("solde")) {
    return "subscriber-insufficient-balance";
  }
  if (hay.includes("secret code") || hay.includes("code secret") || /\bpin\b/.test(hay)) {
    return "subscriber-invalid-secret-code";
  }
  if (hay.includes("timeout") || hay.includes("expir")) {
    return "subscriber-timeout";
  }
  if (
    hay.includes("not found") ||
    hay.includes("does not exist") ||
    hay.includes("n'existe") ||
    hay.includes("n’existe")
  ) {
    return "subscriber-not-found";
  }
  return codeInText(raw);
}

export function extractMesombCode(source: unknown, depth = 0): string | null {
  if (source == null || depth > 4) return null;
  if (typeof source === "string") {
    return normalizeMesombCode(source) ?? codeInText(source) ?? inferMesombCodeFromMessage(source);
  }
  if (typeof source !== "object") return null;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = extractMesombCode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = source as Record<string, unknown>;
  for (const key of CODE_KEYS) {
    const value = record[key];
    const found = normalizeMesombCode(typeof value === "string" ? value : null);
    if (found) return found;
  }
  for (const key of NESTED_KEYS) {
    const found = extractMesombCode(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

export function translateMesombFailure(code?: string | null, fallback?: string | null) {
  const resolved =
    normalizeMesombCode(code) ??
    (typeof fallback === "string" ? extractMesombCode(fallback) : null);
  if (resolved && resolved in MESSAGES) {
    return MESSAGES[resolved as (typeof MESOMB_CODES)[number]];
  }
  const text = (fallback || "").trim();
  if (text && !isGenericMesombMessage(text) && !/application[_ ]?key|hmac|signature|unauthorized|forbidden/i.test(text)) {
    return text;
  }
  return FALLBACK;
}
