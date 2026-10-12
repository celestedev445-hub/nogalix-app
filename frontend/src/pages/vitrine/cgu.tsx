import { LegalArticle } from "@/components/vitrine/LegalArticle";
import { appConfig } from "@/lib/appConfig";

export default function CguPage() {
  return (
    <LegalArticle title="Conditions générales d'utilisation">
      <p className="text-navy/80">
        L&apos;utilisation de {appConfig.name} implique l&apos;acceptation des présentes conditions.
      </p>
      <h2 className="font-display text-xl font-semibold">Compte</h2>
      <p className="text-navy/80">
        Vous êtes responsable de la confidentialité de vos identifiants et des informations
        renseignées dans vos CV.
      </p>
      <h2 className="font-display text-xl font-semibold">Contenus</h2>
      <p className="text-navy/80">
        Les textes, fichiers et photos que vous importez restent votre propriété. Vous autorisez{" "}
        {appConfig.name} à les traiter pour générer l&apos;aperçu, l&apos;analyse IA, l&apos;export
        et les correspondances d&apos;emploi.
      </p>
      <h2 className="font-display text-xl font-semibold">Offres</h2>
      <p className="text-navy/80">
        Les plans Gratuit, Pro et Premium décrivent les fonctionnalités disponibles. Les tarifs sont
        exprimés en FCFA (XAF), toutes taxes comprises.
      </p>
      <h2 className="font-display text-xl font-semibold">Paiement et abonnement</h2>
      <p className="text-navy/80">
        Les plans Pro et Premium se règlent par Mobile Money (MTN Mobile Money ou Orange Money), via
        notre prestataire de paiement MeSomb. Le paiement est validé par vous sur votre téléphone ;{" "}
        {appConfig.name} ne reçoit ni ne conserve votre code secret.
      </p>
      <p className="text-navy/80">
        Un abonnement couvre une durée de 1 mois ou de 12 mois (tarif annuel remisé) à compter de la
        confirmation du paiement. Il n&apos;y a <strong>aucune reconduction automatique</strong> : aucun
        prélèvement n&apos;est effectué sans votre validation. Pour prolonger, vous renouvelez vous-même
        depuis la page Plans ou votre profil. Le renouvellement d&apos;un même plan encore actif
        s&apos;ajoute à l&apos;échéance en cours ; un changement de plan prend effet à la date du paiement.
      </p>
      <p className="text-navy/80">
        À l&apos;échéance, sans renouvellement, votre compte repasse automatiquement au plan Gratuit. Vos
        CV et documents sont conservés, mais les fonctionnalités et quotas du plan Gratuit
        s&apos;appliquent de nouveau.
      </p>
      <p className="text-navy/80">
        L&apos;historique de vos paiements et leurs références est consultable dans Profil ›
        Facturation. Pour toute réclamation (paiement débité mais plan non activé, par exemple),
        contactez-nous en indiquant la référence du paiement.
      </p>
    </LegalArticle>
  );
}
