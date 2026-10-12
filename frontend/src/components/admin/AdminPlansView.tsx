import { useEffect, useState } from "react";
import Link from "@/platform/link";
import { useRouter } from "@/platform/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { createAdminPlan, listAdminPlans, type Plan } from "@/services/plans";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

export function AdminPlansView() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [seedCatalog, setSeedCatalog] = useState(true);

  async function reload() {
    setPlans(await listAdminPlans());
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (error) {
        toast({
          title: "Impossible de charger les plans",
          description: error instanceof Error ? error.message : "Réessayez.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCreating(true);
    try {
      const payload = (await createAdminPlan({
        slug: String(form.get("slug") || "").trim(),
        name: String(form.get("name") || "").trim(),
        tagline: String(form.get("tagline") || "").trim() || null,
        description: String(form.get("description") || "").trim() || null,
        price: Number(form.get("price") || 0),
        duration_months: Number(form.get("duration_months") || 1),
        level: Number(form.get("level") || 1),
        cta: String(form.get("cta") || "Choisir").trim() || "Choisir",
        seed_catalog: seedCatalog,
        is_active: true,
      })) as { data?: Plan };
      const created = payload.data;
      toast({ title: "Plan créé", variant: "success" });
      setOpen(false);
      if (created?.id) {
        router.push(`/admin/plans/${created.id}`);
        return;
      }
      await reload();
    } catch (error) {
      toast({
        title: "Création impossible",
        description: error instanceof Error ? error.message : "Vérifiez le slug et réessayez.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold title-logo sm:text-3xl">Plans</h1>
          <p className="mt-1 text-sm text-navy/65">
            Définissez les offres, les limitations (capacités) et les fonctionnalités affichées, comme sur CBC.
          </p>
        </div>
        <Button className="h-10 rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouveau plan
        </Button>
      </div>

      {loading ? (
        <div className={cn("flex items-center justify-center gap-2 rounded-xl bg-white p-10 text-navy/55", cardShadow)}>
          <Loader2 className="animate-spin" />
          Chargement des plans…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={cn("flex flex-col rounded-xl bg-white p-5", cardShadow)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-xl font-bold text-navy">{plan.name}</p>
                  <p className="text-sm text-navy/55">{plan.tagline || plan.slug}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {plan.highlighted ? <Badge className="rounded-full">Mis en avant</Badge> : null}
                  {plan.popular ? (
                    <Badge className="rounded-full bg-indigo text-white">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Populaire
                    </Badge>
                  ) : null}
                  {!plan.is_active ? <Badge variant="secondary">Inactif</Badge> : null}
                </div>
              </div>
              <p className="mt-4 font-display text-2xl font-extrabold text-navy">
                {plan.price.toLocaleString("fr-FR")} FCFA
                <span className="text-sm font-normal text-navy/50"> /mois</span>
              </p>
              <p className="mt-2 text-sm text-navy/65 line-clamp-2">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-navy/70">
                {(plan.feature_names || []).slice(0, 4).map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-navy/45">
                {plan.limitations?.length ?? 0} limitations · niveau {plan.level}
              </p>
              <Button asChild className="mt-4 h-10 rounded-xl">
                <Link href={`/admin/plans/${plan.id}`}>Configurer</Link>
              </Button>
            </article>
          ))}
          {plans.length === 0 ? (
            <div className={cn("col-span-full rounded-xl bg-white p-8 text-center text-navy/55", cardShadow)}>
              Aucun plan. Créez-en un ou relancez le backend pour le seed Gratuit / Pro / Premium.
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau plan</DialogTitle>
            <DialogDescription>
              Les capacités (limitations) peuvent être préremplies selon le niveau (Gratuit / Pro / Premium).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(event) => void onCreate(event)}>
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" required className={cn("mt-1.5", fieldClass)} placeholder="Pro+" />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" required className={cn("mt-1.5", fieldClass)} placeholder="pro-plus" />
            </div>
            <div>
              <Label htmlFor="tagline">Accroche</Label>
              <Input id="tagline" name="tagline" className={cn("mt-1.5", fieldClass)} placeholder="Pour les équipes" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" className={cn("mt-1.5", fieldClass)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input id="price" name="price" type="number" min={0} defaultValue={0} className={cn("mt-1.5", fieldClass)} />
              </div>
              <div>
                <Label htmlFor="level">Niveau (1 à 3+)</Label>
                <Input id="level" name="level" type="number" min={1} max={10} defaultValue={2} className={cn("mt-1.5", fieldClass)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration_months">Durée (mois)</Label>
                <Input
                  id="duration_months"
                  name="duration_months"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className={cn("mt-1.5", fieldClass)}
                />
              </div>
              <div>
                <Label htmlFor="cta">CTA</Label>
                <Input id="cta" name="cta" defaultValue="Choisir" className={cn("mt-1.5", fieldClass)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-navy">Préremplir le catalogue</p>
                <p className="text-xs text-navy/55">Limitations + features selon le niveau</p>
              </div>
              <Switch checked={seedCatalog} onCheckedChange={setSeedCatalog} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="rounded-xl" disabled={creating}>
                {creating ? <Loader2 className="animate-spin" /> : null}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
