import { appConfig } from "@/lib/appConfig";

export const faqItems = [
  {
    q: "Comment créer un CV ?",
    a: "Choisissez un modèle, puis remplissez l'éditeur. L'assistant IA peut rédiger ou reformuler chaque section.",
  },
  {
    q: "Puis-je changer de modèle plus tard ?",
    a: "Oui. Le contenu est conservé, seul le rendu change.",
  },
  {
    q: "Comment convertir un PDF en Word ?",
    a: `La page Convertir (menu Outils) accepte un PDF ou un Word, sans compte. PDF vers Word utilise la même conversion que l'éditeur ${appConfig.name}.`,
  },
  {
    q: "Puis-je importer un CV déjà rédigé ?",
    a: "Oui. Dans Outils → Éditer, déposez un PDF ou un Word : il s'ouvre dans le même éditeur que dans l'espace, mise en page conservée.",
  },
  {
    q: "Comment traduire un CV ?",
    a: "Dans l'éditeur, le bouton Traduire propose les langues. L'IA traduit le contenu rédactionnel et laisse intacts les noms, e-mails, téléphones et liens.",
  },
  {
    q: "À quoi sert Candidature ?",
    a: "Vous collez une offre : l'IA rédige un CV adapté, une lettre de motivation et une checklist. Le résultat n'est plus un brouillon générique.",
  },
  {
    q: "L'export PDF est-il inclus ?",
    a: "L'aperçu, l'impression et l'export PDF sont disponibles depuis l'éditeur. Les fichiers générés se retrouvent aussi dans Documents.",
  },
  {
    q: "À quoi sert Analyse IA ?",
    a: `Elle audite un CV ${appConfig.name} ou un fichier importé : score ATS, points faibles et actions concrètes.`,
  },
  {
    q: "Quelle est la différence entre Mes CV et Documents ?",
    a: "Mes CV contient vos CV éditables. Documents regroupe lettres, exports et pièces jointes.",
  },
  {
    q: "Comment fonctionne Emploi ?",
    a: "La page est publique : vous parcourez les offres récentes. Pour voir l'entreprise, la source et le détail, il faut un compte. Une fois connecté, l'IA peut classer les offres selon votre CV.",
  },
  {
    q: "Le plan Gratuit est-il vraiment gratuit ?",
    a: "Oui. Un CV, les modèles standards, la conversion PDF et Word, 3 essais IA et l'export PDF, sans carte bancaire.",
  },
  {
    q: "Comment payer Pro ou Premium ?",
    a: "Par Mobile Money : MTN Mobile Money ou Orange Money, via notre prestataire MeSomb. Choisissez votre plan, saisissez votre numéro, puis validez la demande sur votre téléphone (MTN : notification ou *126# ; Orange : #150*50#).",
  },
  {
    q: "L'abonnement se renouvelle-t-il automatiquement ?",
    a: "Non. Vous payez pour 1 mois ou 12 mois (-20 % en annuel), sans reconduction automatique. Vous renouvelez vous-même quand vous le souhaitez ; à l'échéance, sans renouvellement, le compte repasse au plan Gratuit et vos CV sont conservés.",
  },
  {
    q: `Puis-je utiliser ${appConfig.name} depuis le Cameroun ?`,
    a: "Oui. L'interface est en français, les tarifs sont en FCFA et les modèles conviennent aux candidatures locales et internationales.",
  },
];
