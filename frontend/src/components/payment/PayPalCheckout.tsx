import { useEffect, useRef, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capturePaypal, formatFcfa, type Payment } from "@/services/payments";
import { applyAuthSession } from "@/lib/applyAuthSession";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void> };
    };
  }
}

function loadPaypalSdk(clientId: string, currency: string, mode: string) {
  const existing = document.querySelector<HTMLScriptElement>("script[data-nogalix-paypal]");
  if (existing) {
    const same =
      existing.dataset.clientId === clientId &&
      existing.dataset.currency === currency &&
      existing.dataset.mode === mode;
    if (same && window.paypal) return Promise.resolve();
    existing.remove();
    delete (window as { paypal?: unknown }).paypal;
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const intent = "capture";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=${intent}`;
    script.async = true;
    script.dataset.nogalixPaypal = "1";
    script.dataset.clientId = clientId;
    script.dataset.currency = currency;
    script.dataset.mode = mode;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger le SDK PayPal."));
    document.body.appendChild(script);
  });
}

export function PayPalCheckout({
  clientId,
  mode = "sandbox",
  orderId,
  reference,
  amount,
  paypalAmount,
  paypalCurrency = "USD",
  onSuccess,
  onCancel,
  cancelling,
}: {
  clientId: string;
  mode?: string;
  orderId: string;
  reference: string;
  amount: number;
  paypalAmount?: string | null;
  paypalCurrency?: string;
  onSuccess: (payment: Payment, user?: Record<string, unknown> | null) => void;
  onCancel: () => void;
  cancelling?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    void (async () => {
      try {
        await loadPaypalSdk(clientId, paypalCurrency || "USD", mode || "sandbox");
        if (cancelled || !hostRef.current || !window.paypal) return;
        hostRef.current.innerHTML = "";
        await window.paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
          createOrder: () => Promise.resolve(orderId),
          onApprove: async () => {
            setBusy(true);
            setError(null);
            try {
              const response = await capturePaypal(reference);
              if (response.user) await applyAuthSession({ user: response.user });
              if (response.data) onSuccess(response.data, response.user);
            } catch (err) {
              setError(err instanceof Error ? err.message : "La capture PayPal a échoué.");
            } finally {
              setBusy(false);
            }
          },
          onCancel: () => {
            setError("Paiement PayPal annulé.");
          },
          onError: () => {
            setError("Une erreur PayPal est survenue. Réessayez.");
          },
        }).render(hostRef.current);
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "SDK PayPal indisponible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, mode, orderId, paypalCurrency, reference, onSuccess]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-navy/65">Montant facturé (FCFA)</span>
          <span className="font-display font-bold">{formatFcfa(amount)}</span>
        </div>
        {paypalAmount ? (
          <p className="mt-1 text-xs text-navy/55">
            PayPal : {paypalAmount} {paypalCurrency} (conversion indicative pour le sandbox).
          </p>
        ) : null}
        <p className="mt-2 text-xs text-navy/50">Référence {reference}</p>
      </div>
      {!ready && !error ? (
        <p className="flex items-center gap-2 text-sm text-navy/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de PayPal…
        </p>
      ) : null}
      <div ref={hostRef} className={busy ? "pointer-events-none opacity-60" : undefined} />
      {error ? (
        <p className="flex items-start gap-1.5 text-sm text-red-600" role="alert">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="w-full rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={cancelling || busy}
        onClick={onCancel}
      >
        {cancelling ? <Loader2 className="animate-spin" /> : <XCircle />}
        Annuler le paiement
      </Button>
    </div>
  );
}
