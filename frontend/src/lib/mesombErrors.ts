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
  "generic-error":
    "Le paiement a été refusé par l'opérateur. Causes fréquentes : solde insuffisant, code PIN incorrect ou demande annulée sur le téléphone.",
  "unknown-issue":
    "Le paiement a été refusé par l'opérateur. Causes fréquentes : solde insuffisant, code PIN incorrect ou demande annulée sur le téléphone.",
};

export function normalizeMesombCode(code?: string | null): string | null {
  if (typeof code !== "string") return null;
  const normalized = code.trim().toLowerCase().replace(/_/g, "-");
  return MESOMB_CODES.includes(normalized as (typeof MESOMB_CODES)[number]) ? normalized : null;
}

export function translateMesombFailure(code?: string | null, fallback?: string | null) {
  const normalized = normalizeMesombCode(code);
  if (normalized) return MESSAGES[normalized as (typeof MESOMB_CODES)[number]];
  const text = (fallback || "").trim();
  if (text && !/^by\s+/i.test(text) && !/^payment failed/i.test(text)) return text;
  return MESSAGES["generic-error"];
}
