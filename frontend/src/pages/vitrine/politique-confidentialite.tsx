import { LegalArticle } from "@/components/vitrine/LegalArticle";
import { appConfig } from "@/lib/appConfig";

export default function PrivacyPage() {
  return (
    <LegalArticle title="Politique de confidentialité">
      <p className="text-navy/80">
        {appConfig.name} traite les données nécessaires à la création de votre CV, à votre compte
        et, le cas échéant, au classement d&apos;offres d&apos;emploi.
      </p>
      <h2 className="font-display text-xl font-semibold">Données collectées</h2>
      <p className="text-navy/80">
        Identité, email, téléphone, localisation, contenus de CV, documents importés et
        préférences de notification. Aucune clé privée n&apos;est stockée dans le code client.
      </p>
      <h2 className="font-display text-xl font-semibold">Conservation</h2>
      <p className="text-navy/80">
        Les données restent associées à votre compte tant qu&apos;il est actif. Vous pouvez demander
        leur rectification ou leur suppression via la page Contact.
      </p>
      <h2 className="font-display text-xl font-semibold">Partage</h2>
      <p className="text-navy/80">
        Nous ne vendons pas vos données. Elles ne sont transmises qu&apos;aux prestataires
        indispensables au fonctionnement du service (hébergement, envoi d&apos;e-mails, paiement).
      </p>
      <h2 className="font-display text-xl font-semibold">Paiement</h2>
      <p className="text-navy/80">
        Les paiements Mobile Money (MTN Mobile Money, Orange Money) sont traités par notre prestataire
        MeSomb. Nous lui transmettons uniquement le numéro de téléphone payeur, l&apos;opérateur et le
        montant. Nous conservons l&apos;historique de vos paiements (référence, plan, montant, statut,
        dates) pour la gestion de votre abonnement et nos obligations comptables. Nous n&apos;avons jamais
        accès à votre code secret Mobile Money.
      </p>
    </LegalArticle>
  );
}
