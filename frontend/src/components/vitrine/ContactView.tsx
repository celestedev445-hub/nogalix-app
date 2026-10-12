import { useState } from "react";
import Link from "@/platform/link";
import { Clock, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { makeRequest } from "@/lib/makeRequest";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useSearchParams } from "@/platform/navigation";
import { useEffect } from "react";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

const contactSubjects = [
  { value: "plan", label: "Question sur un plan" },
  { value: "modele", label: "Question sur un modèle" },
  { value: "export", label: "Export / PDF" },
  { value: "compte", label: "Compte et connexion" },
  { value: "facturation", label: "Facturation" },
  { value: "partenariat", label: "Partenariat" },
  { value: "autre", label: "Autre" },
] as const;

export function ContactView() {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [objet, setObjet] = useState("");
  const [objetError, setObjetError] = useState("");
  const [message, setMessage] = useState("");
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fromQuery = params.get("objet");
    if (fromQuery && contactSubjects.some((item) => item.value === fromQuery)) {
      setObjet(fromQuery);
    }
    const plan = params.get("plan");
    if (fromQuery === "plan" && plan) {
      setMessage((current) => current || `Bonjour, je souhaite souscrire au plan ${plan}.`);
    }
  }, [params]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!objet) {
      setObjetError("Choisissez un objet.");
      return;
    }
    setObjetError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const subject = contactSubjects.find((item) => item.value === objet)?.label ?? objet;
    setPending(true);
    try {
      await makeRequest(
        "contact",
        "POST",
        {
          name: form.get("name"),
          email: form.get("email"),
          objet: subject,
          message,
        },
        false,
        false,
      );
      toast({ title: "Message envoyé", variant: "success" });
      setObjet("");
      setMessage("");
      formElement.reset();
    } catch (error) {
      toast({
        title: "Envoi impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <p className="text-sm font-medium text-principale">Contact</p>
        <h1 className="mt-1 font-display text-2xl font-bold title-logo sm:text-3xl">Parlons de votre CV</h1>
        <p className="mt-2 max-w-md text-sm text-navy/65">
          Une question sur un plan, un modèle ou un export ? L&apos;équipe {appConfig.name} vous
          répond.
        </p>
        <ul className="mt-8 space-y-3">
          <li className={cn("flex items-start gap-3 rounded-xl bg-white p-4", cardShadow)}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-navy">Écrivez-nous</p>
              <p className="text-sm text-navy/55">Formulaire ci-contre, réponse sous 24 h ouvrées.</p>
            </div>
          </li>
          <li className={cn("flex items-start gap-3 rounded-xl bg-white p-4", cardShadow)}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
              <Clock className="h-4 w-4" />
            </span>
            <div>
              <p className="font-medium text-navy">Horaires</p>
              <p className="text-sm text-navy/55">Du lundi au vendredi, 9h à 18h (GMT+1).</p>
            </div>
          </li>
          <li className={cn("flex items-start gap-3 rounded-xl bg-white p-4", cardShadow)}>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-clair text-principale">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-navy">Email</p>
              <a
                href={`mailto:${appConfig.contactEmail}`}
                className="mt-0.5 block break-all text-sm text-principale"
              >
                {appConfig.contactEmail}
              </a>
            </div>
          </li>
        </ul>
        <p className="mt-6 text-sm text-navy/60">
          Peut-être déjà répondu dans la{" "}
          <Link href="/faq" className="font-medium text-principale">
            FAQ
          </Link>
          .
        </p>
      </div>

      <form className={cn("space-y-4 rounded-xl bg-white p-5 md:p-6", cardShadow)} onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              defaultValue={user?.name || ""}
              key={`name-${user?.id ?? "anon"}`}
              className={fieldClass}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={user?.email || ""}
              key={`email-${user?.id ?? "anon"}`}
              className={fieldClass}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="objet">Objet</Label>
          <Select
            value={objet}
            onValueChange={(value) => {
              setObjet(value);
              setObjetError("");
            }}
          >
            <SelectTrigger id="objet" className={cn(fieldClass, "h-11")}>
              <SelectValue placeholder="Choisissez un objet" />
            </SelectTrigger>
            <SelectContent>
              {contactSubjects.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {objetError ? <p className="mt-1 text-sm text-red-500">{objetError}</p> : null}
        </div>
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-36 rounded-xl bg-[#F8FAFC] shadow-none"
          />
        </div>
        <Button type="submit" className="h-11 rounded-xl px-5" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Envoyer le message
        </Button>
      </form>
    </div>
  );
}
