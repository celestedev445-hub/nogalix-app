import { useCallback, useEffect, useState } from "react";
import Link from "@/platform/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  addPlanFeature,
  deletePlanFeature,
  deletePlanLimitation,
  getAdminPlan,
  getCapabilityCatalog,
  updateAdminPlan,
  upsertPlanLimitation,
  type Plan,
} from "@/services/plans";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

export function AdminPlanDetailView({ planId }: { planId: number }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [catalog, setCatalog] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limKey, setLimKey] = useState("");
  const [limType, setLimType] = useState<"boolean" | "count">("boolean");
  const [limValue, setLimValue] = useState("0");
  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");

  const reload = useCallback(async () => {
    const [next, keys] = await Promise.all([getAdminPlan(planId), getCapabilityCatalog()]);
    setPlan(next);
    setCatalog(keys);
    setLimKey((current) => current || keys[0]?.key || "");
  }, [planId]);

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (error) {
        toast({
          title: "Plan introuvable",
          description: error instanceof Error ? error.message : "Réessayez.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  async function savePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await updateAdminPlan(plan.id, {
        name: form.get("name"),
        tagline: form.get("tagline"),
        description: form.get("description"),
        price: Number(form.get("price") || 0),
        duration_months: Number(form.get("duration_months") || 1),
        level: Number(form.get("level") || 1),
        cta: form.get("cta"),
        is_active: plan.is_active,
        highlighted: plan.highlighted,
        popular: plan.popular,
      });
      await reload();
      toast({ title: "Plan mis à jour", variant: "success" });
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveLimitation() {
    if (!plan || !limKey) return;
    try {
      await upsertPlanLimitation(plan.id, {
        key: limKey,
        limitation_type: limType,
        value: Number(limValue),
        description: catalog.find((item) => item.key === limKey)?.label,
      });
      await reload();
      toast({ title: "Limitation enregistrée", variant: "success" });
    } catch (error) {
      toast({
        title: "Limitation impossible",
        description: error instanceof Error ? error.message : "Réessayez.",
        variant: "destructive",
      });
    }
  }

  async function saveFeature() {
    if (!plan || !featureName.trim()) return;
    try {
      await addPlanFeature(plan.id, {
        name: featureName.trim(),
        description: featureDesc.trim() || null,
        is_enabled: true,
        sort_order: plan.features?.length ?? 0,
      });
      setFeatureName("");
      setFeatureDesc("");
      await reload();
      toast({ title: "Fonctionnalité ajoutée", variant: "success" });
    } catch (error) {
      toast({
        title: "Ajout impossible",
        description: error instanceof Error ? error.message : "Réessayez.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center gap-2 rounded-xl bg-white p-10", cardShadow)}>
        <Loader2 className="animate-spin" />
        Chargement…
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
        <p>Plan introuvable.</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/admin/plans">Retour</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-xl">
          <Link href="/admin/plans">
            <ArrowLeft className="h-4 w-4" />
            Plans
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{plan.name}</h1>
          <p className="text-sm text-navy/55">slug · {plan.slug}</p>
        </div>
      </div>

      <form className={cn("grid gap-4 rounded-xl bg-white p-5 md:grid-cols-2", cardShadow)} onSubmit={(e) => void savePlan(e)}>
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={plan.name} className={fieldClass} required />
        </div>
        <div>
          <Label htmlFor="tagline">Accroche</Label>
          <Input id="tagline" name="tagline" defaultValue={plan.tagline || ""} className={fieldClass} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={plan.description || ""} className="min-h-24 rounded-xl bg-[#F8FAFC]" />
        </div>
        <div>
          <Label htmlFor="price">Prix mensuel (FCFA)</Label>
          <Input id="price" name="price" type="number" min={0} defaultValue={plan.price} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="level">Niveau</Label>
          <Input id="level" name="level" type="number" min={1} defaultValue={plan.level} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="duration_months">Durée (mois)</Label>
          <Input id="duration_months" name="duration_months" type="number" min={1} defaultValue={plan.duration_months} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="cta">Libellé CTA</Label>
          <Input id="cta" name="cta" defaultValue={plan.cta} className={fieldClass} />
        </div>
        <div className="flex flex-wrap items-center gap-6 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={plan.is_active} onCheckedChange={(v) => setPlan({ ...plan, is_active: v })} />
            Actif
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={plan.highlighted} onCheckedChange={(v) => setPlan({ ...plan, highlighted: v })} />
            Mis en avant
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={plan.popular} onCheckedChange={(v) => setPlan({ ...plan, popular: v })} />
            Populaire
          </label>
          <Button type="submit" className="ml-auto h-10 rounded-xl" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            Enregistrer le plan
          </Button>
        </div>
      </form>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <h2 className="font-display text-lg font-bold text-navy">Limitations</h2>
        <p className="mt-1 text-sm text-navy/55">Quotas et accès fonctionnels (comme CBC).</p>
        <div className="mt-4 space-y-2">
          {(plan.limitations || []).map((item) => (
            <div key={item.id || item.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium text-navy">
                  {catalog.find((c) => c.key === item.key)?.label || item.key}
                </p>
                <p className="text-xs text-navy/55">
                  {item.key} · {item.limitation_type} · valeur {item.value === -1 ? "illimité" : item.value}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </div>
              {item.id ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-navy/40 hover:text-red-600"
                  aria-label={`Supprimer ${item.key}`}
                  onClick={() =>
                    void deletePlanLimitation(plan.id, item.id!).then(reload).catch((error) =>
                      toast({
                        title: "Suppression impossible",
                        description: error instanceof Error ? error.message : "Réessayez.",
                        variant: "destructive",
                      }),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.6fr_auto]">
          <Select value={limKey} onValueChange={setLimKey}>
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Capacité" />
            </SelectTrigger>
            <SelectContent>
              {catalog.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label} ({item.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={limType} onValueChange={(v) => setLimType(v as "boolean" | "count")}>
            <SelectTrigger className={fieldClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="boolean">boolean (0/1)</SelectItem>
              <SelectItem value="count">count (-1 = ∞)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={limValue}
            onChange={(e) => setLimValue(e.target.value)}
            className={fieldClass}
            placeholder="Valeur"
          />
          <Button type="button" className="h-11 rounded-xl" onClick={() => void saveLimitation()}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </section>

      <section className={cn("rounded-xl bg-white p-5", cardShadow)}>
        <h2 className="font-display text-lg font-bold text-navy">Fonctionnalités marketing</h2>
        <p className="mt-1 text-sm text-navy/55">Puces affichées sur la page tarifs.</p>
        <div className="mt-4 space-y-2">
          {(plan.features || []).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2">
              <div>
                <p className="font-medium text-navy">{item.name}</p>
                {item.description ? <p className="text-xs text-navy/55">{item.description}</p> : null}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-navy/40 hover:text-red-600"
                aria-label={`Supprimer ${item.name}`}
                onClick={() =>
                  void deletePlanFeature(plan.id, item.id!)
                    .then(reload)
                    .catch((error) =>
                      toast({
                        title: "Suppression impossible",
                        description: error instanceof Error ? error.message : "Réessayez.",
                        variant: "destructive",
                      }),
                    )
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            placeholder="Nom de la fonctionnalité"
            className={fieldClass}
          />
          <Input
            value={featureDesc}
            onChange={(e) => setFeatureDesc(e.target.value)}
            placeholder="Description (optionnel)"
            className={fieldClass}
          />
          <Button type="button" className="h-11 rounded-xl" onClick={() => void saveFeature()}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </section>
    </div>
  );
}
