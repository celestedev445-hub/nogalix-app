import Link from "@/platform/link";
import { useRouter, useSearchParams } from "@/platform/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { GoogleAuthSection } from "@/components/auth/GoogleAuthSection";
import { CbcAuthButton } from "@/components/auth/CbcAuthButton";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { login, signup } from "@/services/auth";
import { toast } from "@/hooks/use-toast";
import { safeRedirectPath } from "@/lib/security";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const signupSchema = z
  .object({
    name: z.string().min(2, "Nom trop court"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "6 caractères minimum"),
    password_confirmation: z.string().min(6, "6 caractères minimum"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

const CBC_ERRORS: Record<string, string> = {
  cancelled: "Connexion CBC annulée.",
  invalid_state: "La connexion CBC a expiré. Réessayez.",
  failed: "CBC n'a pas pu confirmer votre compte. Réessayez dans un instant.",
  not_configured: "La connexion avec CBC n'est pas encore disponible.",
  account_disabled: "Compte désactivé.",
  account_conflict: "Ce compte Nogalix est déjà lié à un autre compte CBC.",
};

const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-500">{message}</p>;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get("suivant"), "/dashboard");
  const [pending, setPending] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  function authHref(path: "/auth/login" | "/auth/signup") {
    const query = new URLSearchParams();
    const suivant = safeRedirectPath(params.get("suivant"), "");
    const plan = params.get("plan");
    if (suivant) query.set("suivant", suivant);
    if (plan) query.set("plan", plan);
    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  const form = useForm({
    resolver: zodResolver(mode === "login" ? loginSchema : signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });

  const errors = form.formState.errors;

  // Retour de /api/auth/cbc/callback en échec : ?cbc_error=<code>
  const cbcError = params.get("cbc_error");
  useEffect(() => {
    if (!cbcError) return;
    toast({
      title: "Connexion CBC impossible",
      description: CBC_ERRORS[cbcError] || CBC_ERRORS.failed,
      variant: "destructive",
    });
  }, [cbcError]);

  function go() {
    router.push(next);
  }

  async function onSubmit(values: Record<string, string>) {
    setPending(true);
    try {
      if (mode === "login") {
        await login({ email: values.email, password: values.password });
      } else {
        await signup({
          name: values.name,
          email: values.email,
          password: values.password,
          password_confirmation: values.password_confirmation,
        });
      }
      toast({ title: mode === "login" ? "Connexion réussie" : "Compte créé", variant: "success" });
      go();
    } catch (error) {
      toast({
        title: mode === "login" ? "Connexion impossible" : "Inscription impossible",
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form-blob-wrap mx-auto w-full max-w-md">
      <div className="auth-form-blob-halo" aria-hidden />
      <div className="auth-form-blob">
        <h1 className="font-display text-2xl font-bold text-navy">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <div className="mt-6">
          <div className="mb-3">
            <CbcAuthButton next={next} disabled={pending} />
          </div>
          <GoogleAuthSection onSuccess={go} disabled={pending} onBusyChange={setPending} />
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => void onSubmit(values as Record<string, string>))}
        >
          {mode === "signup" ? (
            <div>
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                autoComplete="name"
                className={fieldClass}
                disabled={pending}
                {...form.register("name")}
              />
              <FieldError message={errors.name?.message as string | undefined} />
            </div>
          ) : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              disabled={pending}
              {...form.register("email")}
            />
            <FieldError message={errors.email?.message as string | undefined} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              {mode === "login" ? (
                <button
                  type="button"
                  className="text-xs font-medium text-principale hover:underline disabled:opacity-50"
                  onClick={() => setForgotOpen(true)}
                  disabled={pending}
                >
                  Mot de passe oublié ?
                </button>
              ) : null}
            </div>
            <PasswordInput
              id="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={fieldClass}
              disabled={pending}
              {...form.register("password")}
            />
            <FieldError message={errors.password?.message as string | undefined} />
          </div>
          {mode === "signup" ? (
            <div>
              <Label htmlFor="password_confirmation">Confirmer le mot de passe</Label>
              <PasswordInput
                id="password_confirmation"
                autoComplete="new-password"
                className={fieldClass}
                disabled={pending}
                {...form.register("password_confirmation")}
              />
              <FieldError message={errors.password_confirmation?.message as string | undefined} />
            </div>
          ) : null}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-navy/70">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <Link href={authHref("/auth/signup")} className="text-principale">
                S&apos;inscrire
              </Link>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <Link href={authHref("/auth/login")} className="text-principale">
                Se connecter
              </Link>
            </>
          )}
        </p>
      </div>
      {mode === "login" ? (
        <ForgotPasswordModal
          open={forgotOpen}
          onOpenChange={setForgotOpen}
          defaultEmail={form.watch("email") || ""}
        />
      ) : null}
    </div>
  );
}
