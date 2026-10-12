import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/platform/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarClock,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Save,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PhoneInput from "@/components/ui/PhoneInput";
import { Input } from "@/components/ui/input";
import { phoneFromInputValue, resolvePhoneCountry } from "@/lib/phoneNumber";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/BackButton";
import { useAuthStore } from "@/store/authStore";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  updateAvatar,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount,
} from "@/services/profile";
import {
  PAYMENT_STATUS_LABELS,
  formatFcfa,
  listPayments,
  type Payment,
  type PaymentStatus,
} from "@/services/payments";
import { MobileMoneyCheckout, type CheckoutPlan } from "@/components/payment/MobileMoneyCheckout";
import { toast } from "@/hooks/use-toast";
import { applyAuthSession, clearAuthSession } from "@/lib/applyAuthSession";
import { cn } from "@/lib/utils";
import { aiTrialsHint } from "@/lib/planCapabilities";
import { useRouter } from "@/platform/navigation";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  location: z.string().optional(),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis"),
    next: z.string().min(8, "8 caractères minimum."),
    confirm: z.string(),
  })
  .refine((values) => values.next === values.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

const TABS = ["informations", "preferences", "securite", "abonnement", "facturation"] as const;
type ProfileTab = (typeof TABS)[number];

const STATUS_CLASS: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-succes",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-[#F1F5F9] text-navy/60",
  expired: "bg-[#F1F5F9] text-navy/60",
};

type PrefKey = "notifyEmail" | "notifyJobs" | "notifyAnalysis";

function formatDay(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "d MMMM yyyy", { locale: fr });
}

function pickUser(response: unknown) {
  const body = response as { user?: Record<string, unknown>; data?: Record<string, unknown> } | null;
  return body?.user || body?.data || null;
}

const tabClass =
  "rounded-xl px-3 py-2 shadow-none data-[state=active]:bg-indigo-clair data-[state=active]:text-principale data-[state=active]:shadow-none";

export function ProfileView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [saving, setSaving] = useState(false);
  const [photoPending, setPhotoPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [countryCode, setCountryCode] = useState(() => resolvePhoneCountry(user?.phone, user?.location));
  const photoRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ProfileTab>("informations");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const prefSeq = useRef<Record<PrefKey, number>>({ notifyEmail: 0, notifyJobs: 0, notifyAnalysis: 0 });

  const currentPlan = (user?.plan as { slug?: string; name?: string; price?: number } | undefined) || undefined;
  const planSlug = currentPlan?.slug || "gratuit";
  const planIsPaid = planSlug !== "gratuit" && Number(currentPlan?.price || 0) > 0;
  const planExpires = formatDay(typeof user?.plan_expires_at === "string" ? user.plan_expires_at : null);
  const checkoutPlan: CheckoutPlan | null = planIsPaid
    ? { slug: planSlug, name: currentPlan?.name || planSlug, price: Number(currentPlan?.price || 0) }
    : null;

  // `?onglet=facturation` (liens des notifications de paiement).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("onglet");
    if (requested && (TABS as readonly string[]).includes(requested)) setTab(requested as ProfileTab);
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      setPayments(await listPayments());
      setPaymentsLoaded(true);
    } catch (error) {
      setPaymentsError(error instanceof Error ? error.message : "Historique indisponible.");
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "facturation" || paymentsLoaded || paymentsLoading || paymentsError) return;
    void loadPayments();
  }, [tab, paymentsLoaded, paymentsLoading, paymentsError, loadPayments]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
      email: user?.email || "",
      phone: user?.phone ? phoneFromInputValue(user.phone) : "",
      location: user?.location || "",
    },
  });

  useEffect(() => {
    if (!user) return;
    form.reset({
      name: user.name || `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim(),
      email: user.email || "",
      phone: user.phone ? phoneFromInputValue(user.phone) : "",
      location: user.location || "",
    });
    setCountryCode(resolvePhoneCountry(user.phone, user.location));
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof schema>) {
    setSaving(true);
    try {
      const payload = {
        ...values,
        phone: values.phone ? phoneFromInputValue(values.phone) : "",
      };
      const response = (await updateProfile(payload)) as {
        user?: Record<string, unknown>;
        data?: Record<string, unknown>;
      };
      const nextUser = response.user || response.data || { ...user, ...payload };
      await applyAuthSession({ user: nextUser });
      toast({ title: "Profil enregistré", variant: "success" });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier non pris en charge", description: "Choisissez une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image trop lourde", description: "La taille maximale est de 5 Mo.", variant: "destructive" });
      return;
    }
    setPhotoPending(true);
    try {
      const payload = new FormData();
      payload.append("avatar", file);
      const response = (await updateAvatar(payload)) as {
        avatar?: string;
        user?: Record<string, unknown>;
        data?: Record<string, unknown>;
      };
      const avatar =
        response.avatar ||
        (response.user as { avatar?: string } | undefined)?.avatar ||
        (response.data as { avatar?: string } | undefined)?.avatar;
      if (avatar) {
        await applyAuthSession({ user: { ...user, ...(response.user || response.data || {}), avatar } });
      }
      toast({ title: "Photo mise à jour", variant: "success" });
    } catch (error) {
      toast({
        title: "Photo non mise à jour",
        description: error instanceof Error ? error.message : "Réessayez avec une autre image.",
        variant: "destructive",
      });
    } finally {
      setPhotoPending(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function setPref(key: PrefKey, value: boolean) {
    const previous = useAuthStore.getState().user?.[key];
    const seq = ++prefSeq.current[key];
    await applyAuthSession({ user: { ...useAuthStore.getState().user, [key]: value } });
    try {
      const response = await updatePreferences({ [key]: value });
      const nextUser = pickUser(response);
      if (nextUser && seq === prefSeq.current[key]) await applyAuthSession({ user: nextUser });
    } catch (error) {
      if (seq !== prefSeq.current[key]) return;
      await applyAuthSession({ user: { ...useAuthStore.getState().user, [key]: previous } });
      toast({
        title: "Préférence non enregistrée",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    }
  }

  async function onDeleteAccount(event: React.FormEvent) {
    event.preventDefault();
    if (deleteConfirm.trim() !== "SUPPRIMER") {
      setDeleteError("Tapez SUPPRIMER en majuscules pour confirmer.");
      return;
    }
    setDeleteError(null);
    setDeletePending(true);
    try {
      await deleteAccount({
        confirm: "SUPPRIMER",
        ...(deletePassword ? { password: deletePassword } : {}),
      });
      setDeleteOpen(false);
      await clearAuthSession();
      toast({ title: "Compte supprimé", description: "Vos données ont été effacées. À bientôt." });
      router.replace("/");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Suppression impossible. Réessayez.");
    } finally {
      setDeletePending(false);
    }
  }

  async function onPassword(event: React.FormEvent) {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(passwords);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      toast({
        title: issue?.path[0] === "next" ? "Mot de passe trop court" : issue?.message || "Mot de passe invalide",
        description: issue?.path[0] === "next" ? issue.message : undefined,
        variant: "destructive",
      });
      return;
    }
    setPasswordPending(true);
    try {
      await changePassword({
        current_password: passwords.current,
        password: passwords.next,
        password_confirmation: passwords.confirm,
      });
      setPasswords({ current: "", next: "", confirm: "" });
      toast({
        title: "Mot de passe mis à jour",
        description: "Reconnectez-vous avec votre nouveau mot de passe.",
        variant: "success",
      });
      await clearAuthSession();
      router.push("/auth/login");
    } catch (error) {
      toast({
        title: "Mise à jour impossible",
        description: error instanceof Error ? error.message : "Vérifiez votre mot de passe actuel.",
        variant: "destructive",
      });
    } finally {
      setPasswordPending(false);
    }
  }

  const name = form.watch("name") || user?.name || "Profil";

  return (
    <div className="min-w-0 space-y-6 text-navy">
      <div className="flex flex-wrap items-start gap-2">
        <BackButton fallbackHref="/dashboard" className="mt-0.5 hidden xl:inline-flex" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold title-logo sm:text-3xl">Mon profil</h1>
          <p className="mt-1 text-sm text-navy/65">Gérez vos informations et préférences.</p>
        </div>
      </div>

      <section className={cn("rounded-xl bg-white p-5 md:p-6", cardShadow)}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user?.avatar ?? undefined} alt={name} />
            <AvatarFallback className="bg-indigo-clair text-lg text-principale">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={photoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void onPhoto(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              className="rounded-xl"
              disabled={photoPending}
              onClick={() => photoRef.current?.click()}
            >
              {photoPending ? <Loader2 className="animate-spin" /> : null}
              Changer la photo
            </Button>
            <p className="mt-2 text-xs text-navy/50">JPG, PNG ou WebP · 5 Mo max.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)} className="mt-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none bg-transparent p-0">
            <TabsTrigger value="informations" className={tabClass}>
              Informations
            </TabsTrigger>
            <TabsTrigger value="preferences" className={tabClass}>
              Préférences
            </TabsTrigger>
            <TabsTrigger value="securite" className={tabClass}>
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="abonnement" className={tabClass}>
              Abonnement
            </TabsTrigger>
            <TabsTrigger value="facturation" className={tabClass}>
              Facturation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="informations" className="mt-6">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" className={fieldClass} {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" className={fieldClass} {...form.register("email")} />
                {form.formState.errors.email ? (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="relative z-10 overflow-visible">
                <Label htmlFor="phone">Téléphone</Label>
                <PhoneInput
                  value={form.watch("phone") || ""}
                  onChange={(value, data) => {
                    if (data?.countryCode) setCountryCode(data.countryCode.toLowerCase());
                    form.setValue("phone", phoneFromInputValue(value), { shouldDirty: true });
                  }}
                  country={countryCode}
                />
              </div>
              <div>
                <Label htmlFor="location">Localisation</Label>
                <Input id="location" className={fieldClass} {...form.register("location")} />
              </div>
              <div className="flex justify-end md:col-span-2">
                <Button type="submit" className="h-11 rounded-xl px-5" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-3">
            <PrefRow
              icon={Mail}
              title="Emails de l'application"
              hint="Résumé d'activité et rappels utiles."
              checked={user?.notifyEmail !== false}
              onCheckedChange={(value) => void setPref("notifyEmail", value)}
            />
            <PrefRow
              icon={Briefcase}
              title="Alertes d'offres d'emploi"
              hint="Quand une offre correspond bien à votre CV."
              checked={user?.notifyJobs !== false}
              onCheckedChange={(value) => void setPref("notifyJobs", value)}
            />
            <PrefRow
              icon={Sparkles}
              title="Résultats d'analyse IA"
              hint="Score et recommandations après un audit."
              checked={user?.notifyAnalysis !== false}
              onCheckedChange={(value) => void setPref("notifyAnalysis", value)}
            />
          </TabsContent>

          <TabsContent value="securite" className="mt-6">
            <form className="grid max-w-xl gap-4" onSubmit={(event) => void onPassword(event)}>
              <div className="flex items-center gap-2 text-sm text-navy/65">
                <Lock className="h-4 w-4 text-principale" />
                Changez votre mot de passe. Il n&apos;est jamais stocké en clair.
              </div>
              <div>
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  className={fieldClass}
                  value={passwords.current}
                  onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  className={fieldClass}
                  value={passwords.next}
                  onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                />
                <p className="mt-1 text-xs text-navy/50">8 caractères minimum.</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmer</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  className={fieldClass}
                  value={passwords.confirm}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirm: event.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="h-11 rounded-xl px-5" disabled={passwordPending}>
                  {passwordPending ? <Loader2 className="animate-spin" /> : <Shield />}
                  Mettre à jour
                </Button>
              </div>
            </form>

            <div className="mt-8 max-w-xl rounded-xl border border-red-100 bg-red-50/40 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="font-semibold text-navy">Supprimer mon compte</p>
                  <p className="mt-1 text-sm text-navy/65">
                    Vos CV, documents, offres enregistrées et paiements seront définitivement effacés. Un
                    abonnement en cours n&apos;est pas remboursé.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    className="mt-4 h-10 rounded-xl"
                    onClick={() => {
                      setDeleteConfirm("");
                      setDeletePassword("");
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 />
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="abonnement" className="mt-6">
            <div className={cn("max-w-xl rounded-xl bg-[#F8FAFC] p-5", cardShadow)}>
              <p className="text-sm font-medium text-navy/55">Offre actuelle</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-navy">
                {(user?.plan as { name?: string } | undefined)?.name || "Gratuit"}
              </p>
              {planIsPaid ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-navy/70">
                  <CalendarClock className="h-4 w-4 text-principale" />
                  {planExpires ? `Actif jusqu'au ${planExpires}` : "Actif"}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-navy/65">
                {aiTrialsHint(user) || "Les limitations (CV, modèles, IA, emploi) suivent ce plan."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {checkoutPlan ? (
                  <Button type="button" className="h-11 rounded-xl px-5" onClick={() => setCheckoutOpen(true)}>
                    <RefreshCw />
                    Renouveler
                  </Button>
                ) : null}
                <Button
                  asChild
                  variant={checkoutPlan ? "secondary" : "default"}
                  className="h-11 rounded-xl px-5"
                >
                  <Link href="/plans">{checkoutPlan ? "Changer de plan" : "Voir les plans"}</Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="facturation" className="mt-6 space-y-5">
            <div className={cn("flex max-w-2xl flex-wrap items-start justify-between gap-4 rounded-xl bg-[#F8FAFC] p-5", cardShadow)}>
              <div className="flex min-w-0 items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-principale" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy/55">Plan actuel</p>
                  <p className="font-display text-xl font-extrabold text-navy">{currentPlan?.name || "Gratuit"}</p>
                  <p className="mt-1 text-sm text-navy/65">
                    {planIsPaid
                      ? planExpires
                        ? `Échéance le ${planExpires}. Pas de reconduction automatique : renouvelez avant cette date pour garder vos avantages.`
                        : "Pas de reconduction automatique : renouvelez avant l'échéance pour garder vos avantages."
                      : "Aucun abonnement en cours. Passez à Pro ou Premium par Mobile Money (MTN, Orange) ou par carte."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {checkoutPlan ? (
                  <Button type="button" className="h-10 rounded-xl" onClick={() => setCheckoutOpen(true)}>
                    <RefreshCw />
                    Renouveler
                  </Button>
                ) : null}
                <Button asChild variant={checkoutPlan ? "secondary" : "default"} className="h-10 rounded-xl">
                  <Link href="/plans">{checkoutPlan ? "Changer de plan" : "Choisir un plan"}</Link>
                </Button>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-semibold text-navy">Historique des paiements</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-xl"
                  disabled={paymentsLoading}
                  onClick={() => void loadPayments()}
                >
                  {paymentsLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Actualiser
                </Button>
              </div>
              {paymentsLoading && !paymentsLoaded ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-[#F8FAFC] p-8 text-sm text-navy/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des paiements…
                </div>
              ) : paymentsError && !payments.length ? (
                <div className="rounded-xl bg-[#F8FAFC] p-5 text-sm text-navy/65">
                  <p className="font-medium text-navy">Historique indisponible</p>
                  <p className="mt-1">{paymentsError}</p>
                </div>
              ) : payments.length === 0 ? (
                <div className={cn("flex items-start gap-3 rounded-xl bg-[#F8FAFC] p-5", cardShadow)}>
                  <Smartphone className="mt-0.5 h-5 w-5 text-principale" />
                  <div>
                    <p className="font-medium text-navy">Aucun paiement</p>
                    <p className="mt-1 text-sm text-navy/65">
                      Vos paiements Mobile Money et carte, avec leurs références, apparaîtront ici.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {payments.map((item) => {
                    const status = (item.status in PAYMENT_STATUS_LABELS ? item.status : "pending") as PaymentStatus;
                    const periodEnd = formatDay(item.period_end);
                    return (
                      <li
                        key={item.reference || item.id}
                        className={cn("flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[#F8FAFC] p-4", cardShadow)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-navy">
                            {item.plan_name || item.plan_slug} · {item.months >= 12 ? "12 mois" : `${item.months} mois`}
                          </p>
                          <p className="mt-0.5 text-xs text-navy/55">
                            {formatDay(item.paid_at || item.created_at)}
                            {item.service ? ` · ${item.service === "ORANGE" ? "Orange Money" : item.service === "MTN" ? "MTN MoMo" : item.service}` : ""}
                            {status === "completed" && periodEnd ? ` · jusqu'au ${periodEnd}` : ""}
                          </p>
                          <p className="mt-0.5 break-all font-mono text-[11px] text-navy/45">Réf. {item.reference}</p>
                          {status === "failed" && item.failure_reason ? (
                            <p className="mt-1 text-xs text-red-600">{item.failure_reason}</p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold text-navy">{formatFcfa(item.amount)}</p>
                          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CLASS[status])}>
                            {PAYMENT_STATUS_LABELS[status]}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <MobileMoneyCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={checkoutPlan}
        defaultPhone={typeof user?.phone === "string" ? user.phone : null}
        defaultLocation={typeof user?.location === "string" ? user.location : null}
        onSuccess={() => {
          setPaymentsLoaded(false);
          void loadPayments();
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(open) => !deletePending && setDeleteOpen(open)}>
        <AlertDialogContent className="rounded-xl">
          <form onSubmit={(event) => void onDeleteAccount(event)} className="grid gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible : CV, documents, offres enregistrées et historique seront effacés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <Label htmlFor="delete-confirm">
                Tapez <span className="font-mono font-semibold">SUPPRIMER</span> pour confirmer
              </Label>
              <Input
                id="delete-confirm"
                autoComplete="off"
                className={fieldClass}
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
              />
            </div>
            {user?.has_password === false ? null : (
            <div>
              <Label htmlFor="delete-password">
                Mot de passe{user?.has_google ? " (si vous en avez défini un)" : ""}
              </Label>
              <PasswordInput
                id="delete-password"
                autoComplete="current-password"
                className={fieldClass}
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
              <p className="mt-1 text-xs text-navy/50">
                Requis si votre compte est protégé par un mot de passe.
              </p>
            </div>
            )}
            {deleteError ? (
              <p className="text-sm text-red-600" role="alert">
                {deleteError}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={deletePending}>
                Annuler
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                className="rounded-xl"
                disabled={deletePending || deleteConfirm.trim() !== "SUPPRIMER"}
              >
                {deletePending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Supprimer mon compte
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PrefRow({
  icon: Icon,
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  icon: typeof Bell;
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] p-4", cardShadow)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-navy">{title}</p>
          <p className="text-sm text-navy/55">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  );
}
