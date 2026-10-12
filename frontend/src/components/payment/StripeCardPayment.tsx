import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatFcfa, getPayment, type Payment } from "@/services/payments";

const STRIPE_ELEMENT_STYLE = {
  base: {
    fontSize: "15px",
    color: "#0f172a",
    fontFamily: "inherit",
    "::placeholder": { color: "#94a3b8" },
  },
  invalid: { color: "#dc2626" },
} as const;

const stripeFieldClass =
  "min-h-[44px] rounded-xl border border-gris bg-[#F8FAFC] px-3 py-3 transition-colors focus-within:border-principale focus-within:ring-1 focus-within:ring-principale [&_.StripeElement]:min-h-[24px]";

type CardFormStatus = "idle" | "confirming" | "verifying" | "failed";

function StripeCardForm({
  clientSecret,
  reference,
  amount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  reference: string | null;
  amount?: number;
  onSuccess?: (payment?: Payment) => void;
  onError?: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<CardFormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) setReady(true);
  }, [stripe, elements]);

  const verifyUntilCompleted = useCallback(async () => {
    if (!reference) return undefined;
    for (let i = 0; i < 12; i += 1) {
      try {
        const result = await getPayment(reference);
        const next = result?.data;
        const s = (next?.status || "").toLowerCase();
        if (s === "completed") return next;
        if (s === "failed" || s === "cancelled" || s === "expired") {
          throw new Error(next?.failure_reason || "Le paiement par carte a été refusé.");
        }
      } catch (err) {
        if (err instanceof Error && /refusé|échoué|annul/i.test(err.message)) throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    return undefined;
  }, [reference]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) return;

    setStatus("confirming");
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardNumber },
    });

    if (error) {
      const msg = error.message || "Le paiement par carte a échoué.";
      setStatus("failed");
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      setStatus("verifying");
      try {
        const next = await verifyUntilCompleted();
        onSuccess?.(next);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Le paiement n'a pas pu être confirmé.";
        setStatus("failed");
        setErrorMsg(msg);
        onError?.(msg);
      }
      return;
    }

    const fallback = "Le paiement n'a pas été confirmé. Réessayez.";
    setStatus("failed");
    setErrorMsg(fallback);
    onError?.(fallback);
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-navy/55">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement du formulaire carte…
      </div>
    );
  }

  const busy = status === "confirming" || status === "verifying";

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div>
        <Label>Numéro de carte</Label>
        <div className={cn("mt-1", stripeFieldClass)}>
          <CardNumberElement options={{ style: STRIPE_ELEMENT_STYLE, showIcon: true }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Expiration</Label>
          <div className={cn("mt-1", stripeFieldClass)}>
            <CardExpiryElement options={{ style: STRIPE_ELEMENT_STYLE }} />
          </div>
        </div>
        <div>
          <Label>CVC</Label>
          <div className={cn("mt-1", stripeFieldClass)}>
            <CardCvcElement options={{ style: STRIPE_ELEMENT_STYLE }} />
          </div>
        </div>
      </div>
      {errorMsg ? (
        <p className="flex items-start gap-1.5 text-sm text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMsg}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-xl shadow-brand" disabled={!stripe || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Lock />}
        {status === "confirming"
          ? "Paiement en cours…"
          : status === "verifying"
            ? "Validation…"
            : `Payer ${formatFcfa(amount || 0)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-navy/45">
        <Lock className="h-3.5 w-3.5" /> Visa · Mastercard · paiement sécurisé
      </p>
    </form>
  );
}

export function StripeCardPayment({
  publishableKey,
  clientSecret,
  reference,
  amount,
  onSuccess,
  onError,
}: {
  publishableKey: string;
  clientSecret: string;
  reference: string | null;
  amount?: number;
  onSuccess?: (payment?: Payment) => void;
  onError?: (message: string) => void;
}) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const stripePromise = useMemo<Promise<Stripe | null>>(() => {
    setLoadError(null);
    return loadStripe(publishableKey).then((stripe) => {
      if (!stripe) setLoadError("Impossible de charger le formulaire carte.");
      return stripe;
    });
  }, [publishableKey]);

  if (loadError) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-red-600" role="alert">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {loadError}
      </p>
    );
  }

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <StripeCardForm
        clientSecret={clientSecret}
        reference={reference}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
