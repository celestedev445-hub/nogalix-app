import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/platform/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, Check, Shield, Smartphone, Sparkles } from "lucide-react";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { listPublicPlans, type Plan } from "@/services/plans";
import { plans as fallbackPlans } from "@/lib/demoData";
import { MobileMoneyCheckout, type CheckoutPlan } from "@/components/payment/MobileMoneyCheckout";
import { getPaymentConfig, planPriceFor } from "@/services/payments";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function toCardPlan(plan: Plan) {
  return {
    id: plan.slug,
    name: plan.name,
    tagline: plan.tagline || "",
    priceMonthly: plan.price,
    cta: plan.cta || "Choisir",
    features: plan.feature_names?.length
      ? plan.feature_names
      : (plan.features || []).filter((f) => f.is_enabled).map((f) => f.name),
    highlighted: plan.highlighted,
    popular: plan.popular,
  };
}

function formatExpiry(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "d MMMM yyyy", { locale: fr });
}

export function PlansView({ dark = true }: { dark?: boolean }) {
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState(() => fallbackPlans);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const authenticated = useAuthStore((s) => s.authenticated);
  const user = useAuthStore((s) => s.user);
  const currentSlug = (user?.plan as { slug?: string } | undefined)?.slug || "gratuit";
  const expiresLabel = formatExpiry(user?.plan_expires_at);
  const [discount, setDiscount] = useState(20);
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    void getPaymentConfig().then((config) => {
      if (typeof config.yearly_discount_percent === "number") setDiscount(config.yearly_discount_percent);
    });
    // `?duree=annuel` pré-sélectionne l'annuel (lien depuis les e-mails ou le profil).
    const params = new URLSearchParams(window.location.search);
    if (params.get("duree") === "annuel") setYearly(true);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listPublicPlans();
        if (rows.length) setPlans(rows.map(toCardPlan));
      } catch {
        /* fallback demoData */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openCheckout(plan: { id: string; name: string; priceMonthly: number }) {
    setCheckoutPlan({ slug: plan.id, name: plan.name, price: plan.priceMonthly });
    setCheckoutOpen(true);
  }

  function onChoose(planId: string) {
    if (planId === "gratuit") {
      router.push(authenticated ? "/cv/nouveau" : "/auth/signup");
      return;
    }
    if (!authenticated) {
      router.push(`/auth/signup?plan=${encodeURIComponent(planId)}${yearly ? "&duree=annuel" : ""}`);
      return;
    }
    const plan = plans.find((item) => item.id === planId);
    if (plan) openCheckout(plan);
  }

  // Retour d'inscription / connexion avec `?plan=` : ouvre directement le paiement.
  useEffect(() => {
    if (autoOpened.current || loading || !authenticated) return;
    const slug = new URLSearchParams(window.location.search).get("plan");
    if (!slug || slug === "gratuit") return;
    const plan = plans.find((item) => item.id === slug);
    if (!plan || plan.priceMonthly <= 0) return;
    autoOpened.current = true;
    openCheckout(plan);
  }, [authenticated, loading, plans]);

  return (
    <div className={cn("space-y-12", dark ? "text-white" : "text-navy")}>
      <div className="text-center">
        <p className={cn("text-sm font-medium", dark ? "text-white/70" : "text-principale")}>
          Tarifs simples
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl md:text-4xl">Choisissez votre plan</h1>
        <p className={cn("mx-auto mt-2 max-w-xl", dark ? "text-white/70" : "text-navy/65")}>
          Gratuit : 3 essais IA. Pro : 30 actions par mois. Premium : IA illimitée et offres d&apos;emploi. Mêmes tarifs.
        </p>
        <div
          className={cn(
            "mx-auto mt-5 inline-flex rounded-xl p-1",
            dark ? "bg-white/10" : "bg-indigo-clair",
          )}
        >
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={cn(
              "rounded-xl px-4 py-1.5 text-sm font-medium",
              !yearly
                ? dark
                  ? "bg-navy text-white"
                  : "bg-white text-navy shadow-sm"
                : dark
                  ? "text-white/70"
                  : "text-navy/55",
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={cn(
              "rounded-xl px-4 py-1.5 text-sm font-medium",
              yearly
                ? dark
                  ? "bg-navy text-white"
                  : "bg-white text-navy shadow-sm"
                : dark
                  ? "text-white/70"
                  : "text-navy/55",
            )}
          >
            Annuel <span className="ml-1 text-indigo">-{discount}%</span>
          </button>
        </div>
      </div>

      {loading ? (
        <BrandLoader size={72} label="Chargement des plans" className="w-full py-16" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isPaid = plan.id !== "gratuit" && plan.priceMonthly > 0;
            const showYearly = yearly && isPaid;
            const price = showYearly ? planPriceFor(plan.priceMonthly, 12, discount) : plan.priceMonthly;
            const isCurrent = authenticated && plan.id === currentSlug;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl p-6",
                  plan.highlighted
                    ? "bg-gradient-brand text-white shadow-brand"
                    : dark
                      ? "bg-white/5"
                      : cn("bg-white", cardShadow),
                )}
              >
                {"popular" in plan && plan.popular ? (
                  <span className="absolute right-4 top-4 rounded-full bg-indigo px-2 py-0.5 text-xs text-white">
                    <Sparkles className="mr-1 inline h-3 w-3" /> Populaire
                  </span>
                ) : null}
                <p className="font-display text-xl font-semibold">{plan.name}</p>
                <p className="text-sm opacity-70">{plan.tagline}</p>
                <p className="mt-4 font-display text-3xl font-bold">
                  {price.toLocaleString("fr-FR")} FCFA
                  <span className="text-sm font-normal opacity-70">{showYearly ? " /an" : " /mois"}</span>
                </p>
                {showYearly ? (
                  <p className="text-xs opacity-70">
                    Soit {Math.round(price / 12).toLocaleString("fr-FR")} FCFA/mois · -{discount} % sur le mensuel
                  </p>
                ) : (
                  <p className="text-xs opacity-70">{isPaid ? "Sans engagement, sans reconduction" : "Sans carte"}</p>
                )}
                {isCurrent ? (
                  <p
                    className={cn(
                      "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      plan.highlighted ? "bg-white/20 text-white" : "bg-emerald-50 text-succes",
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {isPaid && expiresLabel ? `Plan actuel · jusqu'au ${expiresLabel}` : "Plan actuel"}
                  </p>
                ) : null}
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 h-11 w-full rounded-xl"
                  variant={plan.highlighted ? "secondary" : "default"}
                  disabled={isCurrent && !isPaid}
                  onClick={() => onChoose(plan.id)}
                >
                  {isCurrent ? (isPaid ? "Renouveler" : "Plan actuel") : plan.cta}
                </Button>
                {isPaid ? (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs opacity-70">
                    <Smartphone className="h-3.5 w-3.5" />
                    MTN, Orange Money ou carte bancaire
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <p className={cn("flex items-center justify-center gap-2 text-sm", dark ? "text-white/70" : "text-navy/60")}>
        <Shield className="h-4 w-4 text-succes" />
        Paiement Mobile Money ou carte bancaire, sans reconduction automatique : à l&apos;échéance, retour au plan Gratuit.
      </p>

      <MobileMoneyCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={checkoutPlan}
        initialMonths={yearly ? 12 : 1}
        defaultPhone={typeof user?.phone === "string" ? user.phone : null}
        defaultLocation={typeof user?.location === "string" ? user.location : null}
      />
    </div>
  );
}
