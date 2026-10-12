import { useState } from "react";
import { useRouter } from "@/platform/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/services/auth";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
});

type FormValues = z.infer<typeof schema>;

const fieldClass = "h-11 rounded-xl bg-[#F8FAFC] shadow-none";

export function ForgotPasswordModal({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { email: defaultEmail },
  });

  async function onSubmit(values: FormValues) {
    setPending(true);
    try {
      await forgotPassword({ email: values.email });
      toast({
        title: "Code envoyé",
        description: "Si un compte existe, un code de réinitialisation a été envoyé.",
        variant: "success",
      });
      onOpenChange(false);
      router.push(`/auth/reset-password?email=${encodeURIComponent(values.email)}`);
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] max-w-md rounded-2xl sm:mx-0">
        <AlertDialogHeader className="space-y-2 text-left">
          <AlertDialogTitle className="font-display text-navy">Mot de passe oublié</AlertDialogTitle>
          <AlertDialogDescription className="text-navy/70">
            Entrez votre adresse e-mail pour recevoir un code de réinitialisation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="forgot-email">E-mail</Label>
            <Input
              id="forgot-email"
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="rounded-xl" disabled={pending}>
              Annuler
            </AlertDialogCancel>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Recevoir le code
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
