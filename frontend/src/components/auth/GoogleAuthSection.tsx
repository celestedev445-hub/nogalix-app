import { useCallback, useState } from "react";
import { GoogleAuthButton, type GoogleAuthResult } from "@/components/auth/GoogleAuthButton";
import { loginWithGoogle } from "@/services/auth";
import { toast } from "@/hooks/use-toast";

export function GoogleAuthSection({
  disabled = false,
  onSuccess,
  onBusyChange,
}: {
  disabled?: boolean;
  onSuccess?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleCode = useCallback(
    async ({ code, id_token: idToken, access_token: accessToken, error }: GoogleAuthResult) => {
      if (error) {
        toast({ title: error, variant: "destructive" });
        return;
      }
      if (!code && !idToken && !accessToken) return;

      setBusy(true);
      onBusyChange?.(true);
      try {
        await loginWithGoogle({
          ...(code ? { code } : {}),
          ...(idToken ? { id_token: idToken } : {}),
          ...(accessToken ? { access_token: accessToken } : {}),
        });
        toast({ title: "Connexion réussie", variant: "success" });
        onSuccess?.();
      } catch (err) {
        toast({
          title: "Connexion Google impossible",
          description: err instanceof Error ? err.message : "Réessayez dans un instant.",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        onBusyChange?.(false);
      }
    },
    [onBusyChange, onSuccess],
  );

  return (
    <div className="mb-5">
      <GoogleAuthButton onCode={(payload) => void handleCode(payload)} disabled={disabled || busy} />
      <div className="relative mt-5 text-center text-xs font-medium uppercase tracking-[0.14em] text-navy/40">
        <span className="absolute inset-x-0 top-1/2 h-px bg-gris" aria-hidden />
        <span className="relative z-10 bg-white px-3">ou</span>
      </div>
    </div>
  );
}
