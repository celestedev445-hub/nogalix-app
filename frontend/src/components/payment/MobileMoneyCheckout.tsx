import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/platform/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { applyAuthSession } from "@/lib/applyAuthSession";
import { syncPlanCapabilities } from "@/lib/planCapabilities";
import { isNetworkError } from "@/lib/networkError";
import { cn } from "@/lib/utils";
import { useMesombDetectedCountry } from "@/hooks/useMesombDetectedCountry";
import { countryFromLocation, countryFromPhone, isValidMesombMobile, phoneToInputValue } from "@/lib/phoneNumber";
import {
  detectMesombCountry,
  formatPhoneForMesomb,
  mesombCountryByIso2,
  mesombDialCountry,
  MESOMB_SERVICE_LABELS,
  mapMethodToService,
  ussdHint,
  type MesombService,
} from "@/lib/mesombCountries";
import { StripeCardPayment } from "@/components/payment/StripeCardPayment";
import { MesombPhoneInput } from "@/components/payment/MesombPhoneInput";
import { MesombServicePicker } from "@/components/payment/MesombServicePicker";
import { translateMesombFailure } from "@/lib/mesombErrors";
import {
  DEFAULT_PAYMENT_CONFIG,
  cancelPayment,
  formatFcfa,
  getPayment,
  getPaymentConfig,
  planPriceFor,
  startCheckout,
  type Payment,
  type PaymentConfig,
} from "@/services/payments";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 3 * 60 * 1000;

function checkoutPhoneFromProfile(defaultPhone: string, fallbackIso: string) {
  const filled = phoneToInputValue(defaultPhone);
  const fromDial = mesombDialCountry(filled);
  const fromParsed = mesombCountryByIso2(countryFromPhone(defaultPhone || filled));
  const known = fromDial || fromParsed;
  if (known) return { phone: filled, iso: known.iso2 };
  if (countryFromPhone(defaultPhone || filled)) return { phone: "", iso: fallbackIso };
  return { phone: filled, iso: fallbackIso };
}

export type CheckoutPlan = {
  slug: string;
  name: string;
  /** Prix mensuel en FCFA. */
  price: number;
};

type Step = "loading" | "form" | "card" | "waiting" | "timeout" | "success" | "failed" | "disabled";
type PayMethod = "mobile" | "card";

function formatLongDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "d MMMM yyyy", { locale: fr });
}

function formatPhoneDisplay(digits: string) {
  const raw = (digits || "").replace(/\D/g, "");
  if (raw.length <= 3) return raw;
  if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
}

function failureMessage(payment: Payment | null) {
  if (!payment) return "Le paiement n'a pas abouti.";
  if (payment.status === "cancelled") return "Le paiement a été annulé.";
  if (payment.status === "expired") return "La demande de paiement a expiré sans validation.";
  if (payment.service === "CARD" || payment.provider === "keypay") {
    return payment.failure_reason || "Le paiement a été refusé par la banque. Vérifiez votre carte et réessayez.";
  }
  return translateMesombFailure(null, payment.failure_reason);
}

export function MobileMoneyCheckout({
  open,
  onOpenChange,
  plan,
  initialMonths = 1,
  defaultPhone,
  defaultLocation,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: CheckoutPlan | null;
  initialMonths?: number;
  defaultPhone?: string | null;
  defaultLocation?: string | null;
  onSuccess?: (payment: Payment) => void;
}) {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [step, setStep] = useState<Step>("loading");
  const [months, setMonths] = useState(initialMonths >= 12 ? 12 : 1);
  const [phone, setPhone] = useState("");
  const [countryIso2, setCountryIso2] = useState("cm");
  const [phoneInputKey, setPhoneInputKey] = useState("phone-cm");
  const [service, setService] = useState<MesombService>("ORANGE");
  const [payMethod, setPayMethod] = useState<PayMethod>("mobile");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);

  const pollTimer = useRef<number | null>(null);
  const pollStarted = useRef(0);
  const alive = useRef(true);
  const finished = useRef(false);
  const countryTouched = useRef(false);
  const geoIso2 = useMesombDetectedCountry(true);
  const locationIso2 = mesombCountryByIso2(countryFromLocation(defaultLocation || ""))?.iso2 ?? "";
  const geoFallback = locationIso2 || geoIso2 || "cm";

  const stopPolling = useCallback(() => {
    if (pollTimer.current != null) {
      window.clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  // Valeurs initiales lues à l'ouverture seulement (le profil peut changer pendant le paiement).
  const initialRef = useRef({ initialMonths, defaultPhone, defaultLocation });
  initialRef.current = { initialMonths, defaultPhone, defaultLocation };

  // Ouverture : on (re)charge la config et on repart du formulaire.
  useEffect(() => {
    if (!open) {
      stopPolling();
      return;
    }
    finished.current = false;
    setError(null);
    setPayment(null);
    const initial = initialRef.current;
    setMonths(initial.initialMonths >= 12 ? 12 : 1);
    countryTouched.current = false;
    const locIso = mesombCountryByIso2(countryFromLocation(initial.defaultLocation || ""))?.iso2 ?? "";
    const fallback = locIso || geoIso2 || "cm";
    const next = checkoutPhoneFromProfile(initial.defaultPhone || "", fallback);
    setPhone(next.phone);
    setCountryIso2(next.iso);
    setPhoneInputKey(next.phone ? `phone-filled-${next.iso}` : `phone-geo-${next.iso}`);
    setService("ORANGE");
    setStep("loading");
    let cancelled = false;
    void getPaymentConfig().then((next) => {
      if (cancelled || !alive.current) return;
      setConfig(next);
      const mobileOn = Boolean(next.enabled);
      const cardOn = Boolean(next.card_enabled);
      setPayMethod(cardOn && !mobileOn ? "card" : "mobile");
      setStep(mobileOn || cardOn ? "form" : "disabled");
    });
    return () => {
      cancelled = true;
    };
  }, [open, stopPolling]);

  useEffect(() => {
    if (!open || countryTouched.current) return;
    if (mesombDialCountry(phone) || mesombCountryByIso2(countryFromPhone(phone))) return;
    const iso = geoFallback;
    if (!mesombCountryByIso2(iso) || iso === countryIso2) return;
    setCountryIso2(iso);
    setPhoneInputKey(phone ? `phone-filled-${iso}` : `phone-geo-${iso}`);
  }, [open, geoFallback, phone, countryIso2]);

  const discount = config.yearly_discount_percent ?? 20;
  const price = plan ? planPriceFor(plan.price, months, discount) : 0;
  const fullYear = plan ? plan.price * 12 : 0;
  const phoneCountry = mesombCountryByIso2(countryIso2) ?? detectMesombCountry(phone, countryIso2);
  const phoneValid = isValidMesombMobile(phone, phoneCountry.iso2);
  const phoneLocal = formatPhoneForMesomb(phone, phoneCountry.iso2);
  const phoneComplete = phoneLocal.length >= phoneCountry.localLen;
  const availableServices = phoneCountry.services;
  const mobileEnabled = Boolean(config.enabled);
  const cardEnabled = Boolean(config.card_enabled);
  const usingCard = payMethod === "card" && cardEnabled;

  useEffect(() => {
    if (!availableServices.includes(service)) {
      setService(availableServices[0] ?? "ORANGE");
    }
  }, [availableServices, service]);

  const finish = useCallback(
    async (next: Payment, user?: Record<string, unknown> | null) => {
      if (finished.current) return;
      stopPolling();
      if (user) await applyAuthSession({ user });
      if (next.status === "completed") {
        finished.current = true;
        void syncPlanCapabilities();
        setStep("success");
        toast({
          title: "Paiement confirmé",
          description: `Le plan ${next.plan_name || plan?.name || ""} est actif.`,
          variant: "success",
        });
        onSuccess?.(next);
      } else {
        finished.current = true;
        setStep("failed");
      }
    },
    [onSuccess, plan?.name, stopPolling],
  );

  const poll = useCallback(
    (reference: string) => {
      stopPolling();
      pollTimer.current = window.setTimeout(async () => {
        if (!alive.current) return;
        try {
          const response = await getPayment(reference);
          if (!alive.current || finished.current) return;
          if (response?.data) {
            setPayment(response.data);
            if (response.data.status !== "pending") {
              await finish(response.data, response.user);
              return;
            }
          }
        } catch {
          /* réseau instable : on retente au prochain tour */
        }
        if (!alive.current || finished.current) return;
        if (Date.now() - pollStarted.current >= POLL_MAX_MS) {
          setStep("timeout");
          return;
        }
        poll(reference);
      }, POLL_INTERVAL_MS);
    },
    [finish, stopPolling],
  );

  async function onPay(event: React.FormEvent) {
    event.preventDefault();
    if (!plan || submitting) return;
    if (!usingCard && !phoneValid) {
      setError("Saisissez un numéro Mobile Money valide pour le pays sélectionné.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const response = usingCard
        ? await startCheckout({ plan: plan.slug, months, method: "CARD" })
        : await startCheckout({ plan: plan.slug, phone, service, months });
      const next = response?.data;
      if (!next) throw new Error("Réponse inattendue du serveur.");
      setPayment(next);
      if (response.user) await applyAuthSession({ user: response.user });
      if (usingCard && next.client_secret && next.stripe_publishable_key && next.status === "pending") {
        finished.current = false;
        setStep("card");
        return;
      }
      if (next.status === "pending") {
        finished.current = false;
        pollStarted.current = Date.now();
        setStep("waiting");
        poll(next.reference);
      } else {
        await finish(next, response.user);
      }
    } catch (err) {
      if (isNetworkError(err) && err.status === 503) {
        setStep("disabled");
        return;
      }
      setError(err instanceof Error ? err.message : "Le paiement n'a pas pu être lancé.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCheckAgain() {
    if (!payment) return;
    setChecking(true);
    try {
      const response = await getPayment(payment.reference);
      if (response?.data) {
        setPayment(response.data);
        if (response.data.status !== "pending") {
          await finish(response.data, response.user);
          return;
        }
      }
      pollStarted.current = Date.now();
      setStep("waiting");
      poll(payment.reference);
    } catch (err) {
      toast({
        title: "Vérification impossible",
        description: err instanceof Error ? err.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  }

  async function onCancel() {
    if (!payment) return;
    setCancelling(true);
    stopPolling();
    try {
      const response = await cancelPayment(payment.reference);
      const next = response?.data ?? { ...payment, status: "cancelled" as const };
      setPayment(next);
      await finish(next, response?.user);
    } catch (err) {
      toast({
        title: "Annulation impossible",
        description: err instanceof Error ? err.message : "Le paiement est peut-être déjà traité.",
        variant: "destructive",
      });
      // On reprend la vérification : l'opérateur a peut-être déjà validé.
      void onCheckAgain();
    } finally {
      setCancelling(false);
    }
  }

  function retry() {
    finished.current = false;
    setPayment(null);
    setError(null);
    setStep("form");
  }

  function onPhoneChange(value: string, data?: { countryCode?: string }) {
    setPhone(value);
    const nextIso = data?.countryCode?.toLowerCase();
    if (nextIso && mesombCountryByIso2(nextIso)) {
      if (nextIso !== countryIso2) countryTouched.current = true;
      setCountryIso2(nextIso);
    }
    setError(null);
  }

  const expiresAt = formatLongDate(payment?.period_end);
  const pendingService = (mapMethodToService(payment?.service || service) ?? service) as MesombService;
  const pendingCountry = detectMesombCountry(payment?.phone || phone, phoneCountry.iso2);
  const operatorLabel = MESOMB_SERVICE_LABELS[pendingService] || pendingService;
  const ussd = ussdHint(pendingCountry.iso, pendingService);
  const pending = step === "waiting" || step === "timeout";

  const sheetTitle =
    step === "success"
      ? "Paiement confirmé"
      : step === "card"
        ? "Paiement par carte"
        : pending
          ? payment?.service === "CARD"
            ? "Confirmation en cours"
            : "Validez sur votre téléphone"
          : step === "failed"
            ? "Paiement non abouti"
            : `Passer au plan ${plan?.name ?? ""}`;
  const sheetDescription =
    step === "disabled"
      ? "Le règlement en ligne sera ouvert très prochainement."
      : step === "card"
        ? "Visa, Mastercard. Paiement sécurisé, sans reconduction automatique."
        : pending
          ? payment?.service === "CARD"
            ? "Nous confirmons le paiement auprès de la banque."
            : "Nous attendons la confirmation de l'opérateur."
          : step === "success" || step === "failed"
            ? `Référence ${payment?.reference ?? ""}`
            : usingCard
              ? "Paiement sécurisé par carte bancaire. Sans reconduction automatique."
              : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-gris p-0 text-navy sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-gris px-5 py-4 pr-12 text-left">
          <SheetTitle className="font-display text-lg font-bold text-navy">{sheetTitle}</SheetTitle>
          {sheetDescription ? (
            <SheetDescription className="text-sm text-navy/60">{sheetDescription}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="px-5 py-4">

        {step === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Préparation du paiement…
          </div>
        ) : null}

        {step === "disabled" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-indigo-clair p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-principale" />
              <div className="text-sm">
                <p className="font-semibold text-navy">Paiement en ligne bientôt disponible</p>
                <p className="mt-1 text-navy/65">
                  En attendant, contactez l&apos;équipe : nous activons votre plan {plan?.name} manuellement.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={`/contact?objet=plan${plan ? `&plan=${encodeURIComponent(plan.slug)}` : ""}`}>
                  Contacter l&apos;équipe
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {step === "form" && plan ? (
          <form className="space-y-4" onSubmit={(event) => void onPay(event)}>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Durée">
              {[1, 12].map((value) => {
                const selected = months === value;
                const amount = planPriceFor(plan.price, value, discount);
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMonths(value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selected ? "border-principale bg-indigo-clair" : "border-gris bg-white hover:bg-indigo-clair/50",
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {value === 12 ? "Annuel" : "Mensuel"}
                      {value === 12 && discount > 0 ? (
                        <span className="rounded-full bg-indigo px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          -{discount} %
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">{formatFcfa(amount)}</p>
                    <p className="text-xs text-navy/55">{value === 12 ? "pour 12 mois" : "pour 1 mois"}</p>
                  </button>
                );
              })}
            </div>

            {mobileEnabled && cardEnabled ? (
              <div>
                <Label>Moyen de paiement</Label>
                <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moyen de paiement">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!usingCard}
                    onClick={() => {
                      setPayMethod("mobile");
                      setError(null);
                    }}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                      !usingCard ? "border-principale bg-indigo-clair text-principale" : "border-gris bg-white text-navy/70 hover:bg-indigo-clair/50",
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={usingCard}
                    onClick={() => {
                      setPayMethod("card");
                      setError(null);
                    }}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                      usingCard ? "border-principale bg-indigo-clair text-principale" : "border-gris bg-white text-navy/70 hover:bg-indigo-clair/50",
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Carte
                  </button>
                </div>
              </div>
            ) : null}

            {!usingCard ? (
              <>
            <div>
              <Label>Opérateur</Label>
              <p className="mt-1 text-xs text-navy/50">{phoneCountry.name}</p>
              <div className="mt-1">
                <MesombServicePicker
                  services={availableServices}
                  value={availableServices.includes(service) ? service : availableServices[0]}
                  onChange={(next) => {
                    setService(next);
                  }}
                />
              </div>
            </div>

            <div className="relative z-20 overflow-visible">
              <Label htmlFor="momo-phone">Votre numéro {MESOMB_SERVICE_LABELS[service]}</Label>
              <div className="mt-1">
                <MesombPhoneInput
                  key={phoneInputKey}
                  value={phone}
                  onChange={onPhoneChange}
                  country={countryIso2}
                />
              </div>
              {phoneComplete && !phoneValid ? (
                <p className="mt-1 text-xs text-red-500">Numéro Mobile Money invalide pour {phoneCountry.name}.</p>
              ) : (
                <p className="mt-1 text-xs text-navy/50">Le numéro qui recevra la demande de paiement.</p>
              )}
              {error ? (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-red-600" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              ) : null}
            </div>
              </>
            ) : error ? (
              <p className="flex items-start gap-1.5 text-sm text-red-600" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}

            <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-navy/65">
                  Plan {plan.name} · {months === 12 ? "12 mois" : "1 mois"}
                </span>
                <span className="font-display font-bold">{formatFcfa(price)}</span>
              </div>
              {months === 12 && fullYear > price ? (
                <p className="mt-1 text-xs text-succes">
                  Vous économisez {formatFcfa(fullYear - price)} par rapport au mensuel.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-navy/50">
                Pas de renouvellement automatique : à l&apos;échéance, votre compte repasse au plan Gratuit sauf
                si vous renouvelez.
              </p>
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl shadow-brand" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : usingCard ? <CreditCard /> : <Lock />}
              {submitting
                ? usingCard
                  ? "Préparation du paiement…"
                  : "Envoi de la demande…"
                : usingCard
                  ? `Payer ${formatFcfa(price)} par carte`
                  : `Payer ${formatFcfa(price)}`}
            </Button>
          </form>
        ) : null}

        {step === "card" && payment?.client_secret && payment.stripe_publishable_key ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-navy/65">
                  Plan {payment.plan_name || plan?.name} · {payment.months === 12 ? "12 mois" : "1 mois"}
                </span>
                <span className="font-display font-bold">{formatFcfa(payment.amount)}</span>
              </div>
            </div>
            <StripeCardPayment
              publishableKey={payment.stripe_publishable_key}
              clientSecret={payment.client_secret}
              reference={payment.reference}
              amount={payment.amount}
              onSuccess={(next) => {
                if (next) {
                  setPayment(next);
                  void finish(next);
                  return;
                }
                pollStarted.current = Date.now();
                setStep("waiting");
                poll(payment.reference);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={cancelling}
              onClick={() => void onCancel()}
            >
              {cancelling ? <Loader2 className="animate-spin" /> : <XCircle />}
              Annuler le paiement
            </Button>
          </div>
        ) : null}

        {pending && payment ? (
          <div className="space-y-4">
            {payment.service === "CARD" || payment.provider === "keypay" ? (
              <div className="flex items-center gap-3 rounded-xl bg-indigo-clair p-4">
                <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-principale">
                  <CreditCard className="h-5 w-5" />
                  {step === "waiting" ? (
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-principale/40 motion-reduce:hidden" />
                  ) : null}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{formatFcfa(payment.amount)} · Carte bancaire</p>
                  <p className="text-navy/65">Référence {payment.reference}</p>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-3 rounded-xl bg-indigo-clair p-4">
              <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-principale">
                <Smartphone className="h-5 w-5" />
                {step === "waiting" ? (
                  <span className="absolute inset-0 animate-ping rounded-full border-2 border-principale/40 motion-reduce:hidden" />
                ) : null}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">
                  {formatFcfa(payment.amount)} · {operatorLabel}
                </p>
                <p className="text-navy/65">
                  +{pendingCountry.dial} {formatPhoneDisplay(payment.phone)}
                </p>
              </div>
            </div>
            )}
            {payment.service === "CARD" || payment.provider === "keypay" ? null : (
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-navy/75">
              <li>Une demande de paiement {operatorLabel} est envoyée sur votre téléphone.</li>
              <li>Validez-la avec votre code secret, au {pendingCountry.name}.</li>
              <li>Le plan s&apos;active dès la confirmation de l&apos;opérateur.</li>
            </ol>
            )}
            {step === "waiting" ? (
              <p className="flex items-center gap-2 text-sm text-navy/55" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" />
                En attente de votre validation…
              </p>
            ) : (
              <p className="flex items-start gap-2 text-sm text-amber-700" aria-live="polite">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Toujours aucune confirmation. Si vous avez validé, vérifiez à nouveau ; sinon annulez et
                réessayez.
              </p>
            )}
            {ussd && payment.service !== "CARD" && payment.provider !== "keypay" ? (
              <p className="text-xs text-navy/50">
                Pas de notification ? Composez {ussd} pour valider le paiement {operatorLabel}.
              </p>
            ) : null}
            <p className="text-xs text-navy/45">
              Vous pouvez fermer ce panneau : le plan sera activé dès la confirmation (suivi dans Profil ›
              Facturation).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={cancelling}
                onClick={() => void onCancel()}
              >
                {cancelling ? <Loader2 className="animate-spin" /> : <XCircle />}
                Annuler le paiement
              </Button>
              {step === "timeout" ? (
                <Button type="button" className="rounded-xl" disabled={checking} onClick={() => void onCheckAgain()}>
                  {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Vérifier à nouveau
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === "success" ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-succes" />
            <div>
              <p className="font-display text-lg font-bold">
                Plan {payment?.plan_name || plan?.name} activé
              </p>
              <p className="mt-1 text-sm text-navy/65">
                {expiresAt ? `Actif jusqu'au ${expiresAt}.` : "Votre plan est actif."} Pensez à renouveler avant
                l&apos;échéance.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="secondary" className="rounded-xl">
                <Link href="/profil?onglet=facturation">Voir mes paiements</Link>
              </Button>
              <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Continuer
              </Button>
            </div>
          </div>
        ) : null}

        {step === "failed" ? (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="text-sm text-navy/70">{failureMessage(payment)}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button type="button" variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button type="button" className="rounded-xl" onClick={retry}>
                <RefreshCw />
                Réessayer
              </Button>
            </div>
          </div>
        ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
