import Link from "@/platform/link";
import { appConfig } from "@/lib/appConfig";
import { faqItems } from "@/lib/vitrineContent";
import { FaqAccordion } from "@/components/vitrine/FaqAccordion";

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm font-medium text-principale">Aide</p>
        <h1 className="mt-1 font-display text-3xl font-bold title-logo">Questions fréquentes</h1>
        <p className="mt-2 text-sm text-navy/65">
          Tout ce qu&apos;il faut savoir avant de créer votre CV sur {appConfig.name}.
        </p>
      </div>
      <FaqAccordion items={faqItems} />
      <div className="rounded-xl bg-gradient-brand px-6 py-8 text-center text-white">
        <p className="font-display text-xl font-bold">Vous ne trouvez pas votre réponse ?</p>
        <p className="mt-1 text-sm text-white/80">L&apos;équipe vous répond sous 24 h ouvrées.</p>
        <Link
          href="/contact"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-medium text-navy"
        >
          Nous écrire
        </Link>
      </div>
    </div>
  );
}
