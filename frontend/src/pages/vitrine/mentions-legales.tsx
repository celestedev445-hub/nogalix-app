import { LegalArticle } from "@/components/vitrine/LegalArticle";
import { appConfig } from "@/lib/appConfig";

export default function MentionsPage() {
  return (
    <LegalArticle title="Mentions légales">
      <p className="text-navy/80">
        {appConfig.name} est une application de création de CV, d&apos;analyse ATS et de mise en
        relation avec des offres d&apos;emploi.
      </p>
      <h2 className="font-display text-xl font-semibold">Éditeur</h2>
      <p className="text-navy/80">
        L&apos;identité de l&apos;éditeur, l&apos;adresse de publication et les coordonnées de
        contact seront complétées avant la mise en production.
      </p>
      <h2 className="font-display text-xl font-semibold">Hébergement</h2>
      <p className="text-navy/80">
        Les informations de l&apos;hébergeur (raison sociale, adresse, téléphone) seront précisées
        ici dès le déploiement public.
      </p>
      <h2 className="font-display text-xl font-semibold">Propriété intellectuelle</h2>
      <p className="text-navy/80">
        Les modèles, l&apos;interface et la marque {appConfig.name} sont protégés. Les contenus que
        vous saisissez (CV, lettres, pièces) restent votre propriété.
      </p>
    </LegalArticle>
  );
}
