import Link from "@/platform/link";
import { BrandLogo } from "@/components/vitrine/BrandLogo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9FBFF] px-6 text-center">
      <BrandLogo href="/" />
      <p className="mt-8 text-sm font-medium text-principale">Erreur 404</p>
      <h1 className="mt-2 font-display text-3xl font-bold title-logo">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-navy/65">
        Cette page n&apos;existe pas ou a été déplacée. Revenez à l&apos;accueil pour continuer.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-transform duration-brand hover:bg-primary/90 active:scale-[0.97]"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
