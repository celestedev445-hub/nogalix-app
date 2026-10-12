export type AnalysisImpact = "élevé" | "moyen" | "faible";

export type AnalysisCategory = {
  id: string;
  label: string;
  score: number;
};

export type AnalysisCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type AnalysisSuggestion = {
  id: string;
  title: string;
  description: string;
  impact: AnalysisImpact;
};

export type CvAnalysis = {
  score: number;
  label: string;
  summary: string;
  categories: AnalysisCategory[];
  checks: AnalysisCheck[];
  strengths: string[];
  suggestions: AnalysisSuggestion[];
  keywordsFound: string[];
  keywordsMissing: string[];
  sourceKind: "cv" | "upload";
  sourceLabel: string;
  cvId?: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLabel(score: number) {
  if (score >= 85) return "Très bon";
  if (score >= 70) return "Bon";
  if (score >= 50) return "Moyen";
  return "À améliorer";
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9+.#]+/)
        .filter((word) => word.length > 3),
    ),
  );
}

type ApiAnalysisPayload = {
  score?: number;
  label?: string;
  summary?: string;
  suggestions?: AnalysisSuggestion[];
  categories?: AnalysisCategory[];
  keywordsFound?: string[];
  keywordsMissing?: string[];
  cvId?: string;
};

export function mergeApiAnalysis(local: CvAnalysis, api?: ApiAnalysisPayload | null): CvAnalysis {
  if (!api?.score) return local;
  const suggestions =
    api.suggestions?.length && api.suggestions.length >= local.suggestions.length
      ? api.suggestions
      : local.suggestions;
  const categories =
    api.categories?.length && api.categories.length >= local.categories.length
      ? api.categories
      : local.categories;

  return {
    ...local,
    score: api.score,
    label: api.label || local.label,
    summary: api.summary || local.summary,
    suggestions,
    categories,
    keywordsFound: api.keywordsFound?.length ? api.keywordsFound : local.keywordsFound,
    keywordsMissing: api.keywordsMissing?.length ? api.keywordsMissing : local.keywordsMissing,
    cvId: api.cvId || local.cvId,
  };
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

export function analyzeResumeText(text: string, sourceLabel: string, jobOffer = ""): CvAnalysis {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter((line) => /^[-•*▪▸]/.test(line) || /^\d+[.)]/.test(line));
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(normalized);
  const hasPhone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(normalized);
  const hasLocation = /\b(paris|lyon|marseille|abidjan|dakar|douala|yaoundé|remote|télétravail)\b/i.test(
    normalized,
  );
  const sectionHits = countMatches(lower, [
    /expérience|experience|parcours|emploi/i,
    /formation|dipl[oô]me|universit/i,
    /compétence|competence|skill/i,
    /projet|certification|langue/i,
  ]);
  const quantified = (normalized.match(/\d+\s*%|\d+\s*(ans|mois|k€|fcfa|projets|clients)/gi) || []).length >= 2;
  const wordCount = normalized.split(/\s+/).length;
  const summaryReady = wordCount >= 120;
  const experiencesReady = sectionHits >= 2 && bulletLines.length >= 3;
  const skillsReady =
    (normalized.match(/\b(javascript|python|react|sql|excel|gestion|marketing|design|java|node)\b/gi) || [])
      .length >= 4;

  const contenu = clamp(
    (summaryReady ? 30 : wordCount >= 60 ? 16 : 6) +
      (experiencesReady ? 26 : bulletLines.length >= 1 ? 14 : 4) +
      (quantified ? 22 : 6) +
      (sectionHits >= 3 ? 12 : 4),
  );
  const structure = clamp(
    (hasEmail ? 18 : 6) +
      (hasPhone ? 16 : 4) +
      (hasLocation ? 14 : 4) +
      (sectionHits >= 3 ? 24 : sectionHits * 6) +
      (lines.length >= 12 ? 16 : 6),
  );
  const competences = clamp(skillsReady ? 78 : sectionHits >= 2 ? 52 : 28);
  const presentation = clamp(
    (normalized.length >= 800 ? 24 : normalized.length >= 400 ? 16 : 8) +
      (bulletLines.length >= 4 ? 20 : 8) +
      (hasEmail && hasPhone ? 18 : 8) +
      20,
  );

  const score = clamp(contenu * 0.32 + structure * 0.24 + competences * 0.24 + presentation * 0.2);
  const label = scoreLabel(score);

  const checks: AnalysisCheck[] = [
    {
      id: "contact",
      label: "Coordonnées détectées",
      ok: hasEmail && hasPhone,
      detail:
        hasEmail && hasPhone
          ? "Email et téléphone ont été repérés dans le document."
          : "Ajoutez email et téléphone en tête de CV.",
    },
    {
      id: "volume",
      label: "Volume de contenu suffisant",
      ok: wordCount >= 120,
      detail:
        wordCount >= 120
          ? "Le document contient assez de matière pour une analyse fiable."
          : "Le CV semble trop court pour convaincre un recruteur.",
    },
    {
      id: "sections",
      label: "Sections classiques repérées",
      ok: sectionHits >= 3,
      detail:
        sectionHits >= 3
          ? "Expérience, formation ou compétences sont identifiables."
          : "Structurez le CV avec des rubriques claires.",
    },
    {
      id: "chiffres",
      label: "Résultats chiffrés",
      ok: quantified,
      detail: quantified
        ? "Des indicateurs chiffrés apparaissent dans le texte."
        : "Ajoutez des résultats mesurables (% , volumes, délais).",
    },
    {
      id: "puces",
      label: "Expériences en puces",
      ok: bulletLines.length >= 3,
      detail:
        bulletLines.length >= 3
          ? "Les expériences semblent détaillées en listes."
          : "Détaillez chaque poste avec 2 à 4 puces concrètes.",
    },
    {
      id: "ats",
      label: "Texte exploitable par un ATS",
      ok: normalized.length >= 400 && hasEmail,
      detail:
        normalized.length >= 400 && hasEmail
          ? "Le fichier contient du texte sélectionnable, lisible par un ATS."
          : "Évitez les PDF scannés ou les mises en page trop graphiques.",
    },
  ];

  const strengths: string[] = [];
  if (hasEmail) strengths.push("Une adresse email est clairement visible.");
  if (experiencesReady) strengths.push("Le parcours professionnel paraît structuré.");
  if (skillsReady) strengths.push("Plusieurs compétences métier ressortent du document.");
  if (quantified) strengths.push("Des réalisations chiffrées sont déjà présentes.");
  if (!strengths.length) strengths.push("Le document est analysable : affinez-le section par section.");

  const suggestions: AnalysisSuggestion[] = [];
  if (!quantified) {
    suggestions.push({
      id: "s-chiffres",
      title: "Ajoutez des réalisations quantifiées",
      description: "Chaque expérience devrait contenir au moins un résultat mesurable.",
      impact: "élevé",
    });
  }
  if (!skillsReady) {
    suggestions.push({
      id: "s-skills",
      title: "Renforcez les mots-clés métier",
      description: "Reprenez les outils et compétences exacts de votre secteur.",
      impact: "élevé",
    });
  }
  if (!hasEmail || !hasPhone) {
    suggestions.push({
      id: "s-contact",
      title: "Complétez les coordonnées",
      description: "Email et téléphone doivent apparaître dès le haut du CV.",
      impact: "moyen",
    });
  }
  if (!sectionHits || sectionHits < 3) {
    suggestions.push({
      id: "s-structure",
      title: "Clarifiez les rubriques",
      description: "Séparez expériences, formation, compétences et langues.",
      impact: "moyen",
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      id: "s-offre",
      title: "Adaptez le CV à chaque offre",
      description: "Réordonnez les compétences selon le poste visé.",
      impact: "faible",
    });
  }

  const jobTokens = tokenize(jobOffer).filter((word) => word.length > 4).slice(0, 16);
  const cvTokens = new Set(tokenize(normalized));
  const keywordsFound = jobTokens.filter((word) => cvTokens.has(word));
  const keywordsMissing = jobTokens.filter((word) => !cvTokens.has(word)).slice(0, 8);

  return {
    score,
    label,
    summary:
      score >= 85
        ? "Votre fichier est bien structuré pour passer un premier filtre ATS."
        : score >= 70
          ? "Bonne base documentaire : quelques ajustements renforceront votre visibilité."
          : "Le document peut être amélioré pour mieux convaincre recruteurs et ATS.",
    categories: [
      { id: "contenu", label: "Contenu", score: contenu },
      { id: "structure", label: "Structure", score: structure },
      { id: "competences", label: "Compétences", score: competences },
      { id: "presentation", label: "Présentation", score: presentation },
    ],
    checks,
    strengths,
    suggestions,
    keywordsFound,
    keywordsMissing,
    sourceKind: "upload",
    sourceLabel,
  };
}

export function analyzeUploadedDocument(fileName: string, jobOffer = ""): CvAnalysis {
  return analyzeResumeText(
    `CV importé : ${fileName}. Complétez ce document dans Nogalix pour une analyse plus précise.`,
    fileName,
    jobOffer,
  );
}
