import Link from "@/platform/link";
import { useRouter, useSearchParams } from "@/platform/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal";
import { resetPassword } from "@/services/auth";
import { toast } from "@/hooks/use-toast";

const schema = z
  .object({
    email: z.string().email("Adresse e-mail invalide"),
    code: z.string().length(6, "Le code doit contenir 6 chiffres"),
    password: z.string().min(6, "6 caractères minimum"),
    password_confirmation: z.string().min(6, "6 caractères minimum"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["password_confirmation"],
  });

type FormValues = z.infer<typeof schema>;

const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: params.get("email") || "",
      code: "",
      password: "",
      password_confirmation: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      await resetPassword({
        email: values.email,
        code: values.code,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      toast({ title: "Mot de passe réinitialisé", variant: "success" });
      router.push("/auth/login");
    } catch (error) {
      toast({
        title: "Réinitialisation impossible",
        description: error instanceof Error ? error.message : "Vérifiez le code et réessayez.",
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
        <h1 className="font-display text-2xl font-bold text-navy">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-navy/70">
          Saisissez le code reçu par e-mail, puis choisissez un nouveau mot de passe.
        </p>
        <p className="mt-1 text-xs text-navy/55">
          Pensez à vérifier vos spams si le message n&apos;apparaît pas.
        </p>

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="reset-email">E-mail</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              disabled={pending}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="reset-code">Code de réinitialisation</Label>
            <Input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={`${fieldClass} tracking-[0.35em]`}
              disabled={pending}
              {...form.register("code")}
            />
            {form.formState.errors.code ? (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.code.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="reset-password">Nouveau mot de passe</Label>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              className={fieldClass}
              disabled={pending}
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="reset-password-confirmation">Confirmer le mot de passe</Label>
            <PasswordInput
              id="reset-password-confirmation"
              autoComplete="new-password"
              className={fieldClass}
              disabled={pending}
              {...form.register("password_confirmation")}
            />
            {form.formState.errors.password_confirmation ? (
              <p className="mt-1 text-sm text-red-500">
                {form.formState.errors.password_confirmation.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-navy/70">
          <button
            type="button"
            className="text-principale hover:underline disabled:opacity-50"
            disabled={pending}
            onClick={() => setForgotOpen(true)}
          >
            Renvoyer un code
          </button>
          <p>
            <Link href="/auth/login" className="text-principale">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
      <ForgotPasswordModal
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        defaultEmail={form.watch("email") || ""}
      />
    </div>
  );
}
