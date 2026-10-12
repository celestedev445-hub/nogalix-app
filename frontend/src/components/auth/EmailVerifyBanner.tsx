import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { resendVerificationEmail, verifyEmail } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/** Bandeau tant que l'adresse e-mail n'est pas confirmée (code à 6 chiffres reçu à l'inscription). */
export function EmailVerifyBanner({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user || user.email_verified !== false) return null;

  function markVerified() {
    const current = useAuthStore.getState().user;
    if (current) setUser({ ...current, email_verified: true });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    try {
      await verifyEmail(code);
      markVerified();
      toast({ title: "Adresse e-mail confirmée", description: "Vos essais IA sont débloqués.", variant: "success" });
    } catch (error) {
      toast({
        title: "Confirmation impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setResending(true);
    try {
      const result = await resendVerificationEmail();
      if (result.email_verified) {
        markVerified();
        return;
      }
      setCode("");
      toast({ title: "Code envoyé", description: result.message, variant: "success" });
    } catch (error) {
      toast({
        title: "Envoi impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <section
      aria-label="Confirmation de l'adresse e-mail"
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-principale/20 bg-indigo-clair px-4 py-3 lg:flex-row lg:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-principale" aria-hidden />
        <p className="min-w-0 text-sm text-navy/80">
          <span className="font-semibold text-navy">Confirmez votre adresse e-mail.</span>{" "}
          Saisissez le code à 6 chiffres envoyé à <span className="break-all font-medium">{user.email}</span>{" "}
          pour débloquer vos essais IA.
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          aria-label="Code de confirmation"
          className="h-10 w-28 rounded-xl bg-white text-center tracking-[0.3em]"
        />
        <Button type="submit" className="h-10 rounded-xl" disabled={code.length !== 6 || busy}>
          {busy ? "Vérification…" : "Confirmer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl text-principale hover:bg-white/70"
          disabled={resending}
          onClick={() => void onResend()}
        >
          {resending ? "Envoi…" : "Renvoyer le code"}
        </Button>
      </form>
    </section>
  );
}
