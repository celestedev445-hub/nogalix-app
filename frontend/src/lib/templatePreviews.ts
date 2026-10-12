import type { CvData, CvTemplate } from "@/lib/cvTypes";
import { emptyCv } from "@/lib/demoData";

const defaultSkills = [
  { id: "s1", name: "HTML / CSS", level: 92 },
  { id: "s2", name: "JavaScript", level: 90 },
  { id: "s3", name: "React", level: 86 },
  { id: "s4", name: "Next.js", level: 78 },
  { id: "s5", name: "Node.js", level: 82 },
  { id: "s6", name: "MongoDB", level: 75 },
];

const defaultLangs = [
  { id: "l1", name: "Français", level: "Natif" },
  { id: "l2", name: "Anglais", level: "Professionnel" },
  { id: "l3", name: "Espagnol", level: "Intermédiaire" },
];

const defaultEdu = [
  { id: "e1", diploma: "Master en Informatique", school: "Université de Yaoundé I", year: "2021 à 2023" },
  { id: "e2", diploma: "Licence en Informatique", school: "Université de Douala", year: "2018 à 2021" },
];

function preview(partial: Partial<CvData> & { templateId: string; title: string }): CvData {
  return emptyCv({
    id: `preview-${partial.templateId}`,
    completion: 92,
    skills: defaultSkills,
    languages: defaultLangs,
    education: defaultEdu,
    interests: [
      { id: "i1", name: "Tech" },
      { id: "i2", name: "Photographie" },
      { id: "i3", name: "Voyage" },
      { id: "i4", name: "Musique" },
    ],
    ...partial,
  });
}

export const templatesCatalog: CvTemplate[] = [
  { id: "atlas", name: "Soft", category: "moderne", description: "Photo arrondie, colonne claire et timeline navy." },
  { id: "ndame", name: "Ndamé", category: "moderne", description: "Bandeau navy, nom en script et carte blanche." },
  { id: "simple-colonne", name: "Colonne", category: "minimaliste", description: "Une colonne, photo ronde, séparateurs gris." },
  { id: "ndiaye", name: "Ndiaye", category: "minimaliste", description: "Nom en capitales, dates à gauche, filets noirs." },
  { id: "elongou-editorial", name: "Éditorial", category: "creatif", description: "Portrait centré, serif et icônes navy." },
  { id: "deux-colonnes", name: "Deux colonnes", category: "moderne", description: "Filet bleu vertical, photo ronde, dates à droite." },
  { id: "bongue", name: "Bongue", category: "creatif", description: "Photo ondulée, logos tech et timeline indigo." },
  { id: "bongue-sidebar", name: "Sidebar", category: "classique", description: "Colonne grise, filets noirs, dates à gauche." },
  { id: "ngo-yellow", name: "Ngo'o", category: "creatif", description: "Sidebar noire, accents jaune, citation encadrée." },
  { id: "mbarga", name: "Mbarga", category: "premium", premium: true, description: "Photo organique, sidebar navy, serif élégant." },
  { id: "photo-haut", name: "Portrait", category: "minimaliste", description: "Photo centrée, une colonne, filet gris." },
  { id: "elongou-typo", name: "Typo", category: "minimaliste", description: "Grand nom capitales, formation et contact en bas." },
  { id: "kouame-photo", name: "Kouamé Photo", category: "minimaliste", description: "Photo carrée à droite, filets gris, dates à gauche." },
  { id: "amina-pastel", name: "Pastel", category: "creatif", description: "Tons olive, photo squircle, badges de compétences." },
  { id: "classique", name: "Classique", category: "classique", description: "Titres à gauche, filet gris, contact à droite." },
  { id: "mvondo", name: "Mvondo", category: "creatif", description: "Nom script, blob vert, barres orange." },
  { id: "enzo-dark", name: "Enzo Dark", category: "premium", premium: true, description: "Sidebar noire, cartes grises, pills de skills." },
  { id: "amina-minimal", name: "Amina", category: "minimaliste", description: "Nom à gauche, contact à droite, filet court." },
  { id: "voundi-dark", name: "Voundi Dark", category: "premium", premium: true, description: "Header noir, carte blanche arrondie, timeline bleue." },
  { id: "voundi-editorial", name: "Voundi", category: "classique", description: "Grille éditoriale, titres à gauche, filets gris." },
  { id: "ndjock", name: "Ndjock", category: "moderne", description: "Photo en haut à droite, contact en barre, timeline." },
  { id: "lateral", name: "Latéral", category: "classique", description: "Sidebar charcoal, photo ronde, filet sous le titre." },
  { id: "essomba", name: "Essomba", category: "premium", premium: true, description: "Sidebar navy, nom script, QR et icônes tech." },
  { id: "ngo-clean", name: "Ngo Clean", category: "minimaliste", description: "Filets noirs, dates à gauche, contact en pied." },
];

export const templateFilters: { id: import("@/lib/cvTypes").TemplateCategory; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "moderne", label: "Moderne" },
  { id: "minimaliste", label: "Minimaliste" },
  { id: "creatif", label: "Créatif" },
  { id: "classique", label: "Classique" },
  { id: "premium", label: "Premium" },
];

export const templatePreviews: Record<string, CvData> = {
  atlas: emptyCv({
    id: "preview-atlas",
    templateId: "atlas",
    title: "Soft",
    identity: {
      firstName: "Alexandre",
      lastName: "Kouamé",
      title: "Développeur Full Stack",
      email: "alexandre.kouame@mail.com",
      phone: "+237 6 78 45 22 11",
      location: "Douala, Cameroun",
      photo: "/images/templates/kouame-portrait.png",
      website: "linkedin.com/in/alexkouame",
      github: "github.com/alexkouame",
    },
    summary:
      "Passionné par le développement web, je conçois des applications modernes, performantes et centrées sur l'utilisateur.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Tech Innov", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web et mobiles, intégration d'API, optimisation des performances."] },
      { id: "x2", title: "Développeur Front-end", company: "Web Agency", start: "2022-01", end: "2023-01", bullets: ["Interfaces modernes et responsives."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Participation à des projets web."] },
    ],
    education: [
      { id: "e1", diploma: "Master en Informatique", school: "Université de Douala", year: "2021 à 2023" },
      { id: "e2", diploma: "Licence en Informatique", school: "Université de Yaoundé", year: "2018 à 2021" },
    ],
    skills: [
      { id: "s1", name: "JavaScript", level: 90 },
      { id: "s2", name: "TypeScript", level: 85 },
      { id: "s3", name: "React", level: 88 },
      { id: "s4", name: "Next.js", level: 82 },
      { id: "s5", name: "Node.js", level: 80 },
      { id: "s6", name: "MongoDB", level: 75 },
    ],
    languages: defaultLangs,
  }),
  ndame: preview({
    templateId: "ndame",
    title: "Ndamé",
    identity: {
      firstName: "Lucas",
      lastName: "Ndamé",
      title: "Développeur Full Stack",
      email: "lucas.ndame@gmail.com",
      phone: "+237 6 12 34 56 78",
      location: "Yaoundé, Cameroun",
      photo: "/images/templates/ndame.png",
      website: "linkedin.com/in/lucasndame",
      github: "github.com/lucasndame",
    },
    summary: "Développeur full stack, je conçois des applications web performantes, accessibles et orientées produit.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web et APIs."] },
      { id: "x2", title: "Développeur Front-end", company: "Web Agency", start: "2021-01", end: "2023-01", bullets: ["Interfaces modernes et responsives."] },
    ],
    skills: [
      { id: "s1", name: "HTML / CSS", level: 92 },
      { id: "s2", name: "JavaScript", level: 90 },
      { id: "s3", name: "React", level: 86 },
      { id: "s4", name: "Node.js", level: 82 },
      { id: "s5", name: "PHP", level: 70 },
      { id: "s6", name: "Git", level: 88 },
    ],
    interests: [
      { id: "i1", name: "Code" },
      { id: "i2", name: "Photographie" },
      { id: "i3", name: "Voyage" },
      { id: "i4", name: "Musique" },
    ],
  }),
  "simple-colonne": preview({
    templateId: "simple-colonne",
    title: "Colonne",
    identity: {
      firstName: "Lucas",
      lastName: "Ndjomo",
      title: "Développeur Web",
      email: "lucas.ndjomo@email.com",
      phone: "+237 6 12 34 56 78",
      location: "Yaoundé, Cameroun",
      photo: "/images/templates/ndjomo.png",
    },
    summary: "Développeur web passionné par la conception d'applications performantes et l'expérience utilisateur.",
    experiences: [
      { id: "x1", title: "Développeur Web", company: "PixelDev", start: "2023-01", end: "", current: true, bullets: ["Développement de sites et d'applications web avec JavaScript, React et Node.js."] },
      { id: "x2", title: "Développeur Junior", company: "CodeLab", start: "2020-01", end: "2022-12", bullets: ["Intégration des maquettes et maintenance des projets existants."] },
    ],
  }),
  ndiaye: preview({
    templateId: "ndiaye",
    title: "Ndiaye",
    identity: {
      firstName: "Lucas",
      lastName: "Ndiaye",
      title: "Développeur Web",
      email: "lucas.ndiaye@email.com",
      phone: "+237 6 12 34 56 78",
      location: "Yaoundé, Cameroun",
    },
    summary:
      "Développeur web passionné par la conception d'applications performantes et l'expérience utilisateur. J'aime transformer des idées en solutions simples, utiles et efficaces.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "SoftDev", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Webify Agency", start: "2021-01", end: "2023-01", bullets: ["Conception de sites et d'applications web et intégration d'API REST."] },
      { id: "x3", title: "Stagiaire Développeur", company: "Netgroup", start: "2020-01", end: "2021-01", bullets: ["Assistance au développement de projets internes et maintenance."] },
    ],
  }),
  "elongou-editorial": preview({
    templateId: "elongou-editorial",
    title: "Éditorial",
    identity: {
      firstName: "David", lastName: "Eloungou", title: "Développeur Web & Mobile",
      email: "david.eloungou@mail.com", phone: "+237 6 12 34 56 78", location: "Yaoundé, Cameroun",
      photo: "/images/templates/elongou.png", website: "linkedin.com/in/davideloungou", github: "github.com/davideloungou",
    },
    summary: "Créatif, rigoureux et passionné par les nouvelles technologies. J'aime transformer des idées en produits digitaux utiles et durables.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Digital Solutions", start: "2023-01", end: "", current: true, bullets: ["Conception et développement d'applications web & mobiles."] },
      { id: "x2", title: "Développeur Front-end", company: "WebStudio", start: "2022-01", end: "2023-01", bullets: ["Interfaces utilisateur modernes et responsives."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Maintenance et amélioration de projets web."] },
    ],
    interests: [{ id: "i1", name: "Design" }, { id: "i2", name: "Photographie" }, { id: "i3", name: "Voyage" }, { id: "i4", name: "Musique" }],
  }),
  "deux-colonnes": preview({
    templateId: "deux-colonnes",
    title: "Deux colonnes",
    identity: {
      firstName: "Mathis", lastName: "Biloa", title: "Développeur Full Stack",
      email: "mathis.biloa@email.com", phone: "+237 6 98 76 54 32", location: "Douala, Cameroun",
      photo: "/images/templates/biloa.png",
    },
    summary: "Développeur full stack avec une solide expérience dans la conception et le développement d'applications web modernes et évolutives.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "TechNova", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web complètes avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "DigitalCraft", start: "2021-01", end: "2023-01", bullets: ["Création de sites vitrines et d'applications web. Intégration des maquettes et consommation d'API."] },
    ],
    education: [{ id: "e1", diploma: "Licence en Informatique", school: "Université de Douala", year: "2018 à 2021" }],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Intermédiaire" }],
  }),
  bongue: preview({
    templateId: "bongue",
    title: "Bongue",
    identity: {
      firstName: "Mathis", lastName: "Bongue", title: "Développeur Web & Mobile",
      email: "mathis.bongue@mail.com", phone: "+237 6 55 78 99 01", location: "Douala, Cameroun",
      photo: "/images/templates/bongue.png", website: "linkedin.com/in/mathisbongue", github: "github.com/mathisbongue",
    },
    summary: "Développeur passionné, curieux et créatif. J'aime apprendre de nouvelles technologies et relever des défis techniques pour construire des produits utiles et durables.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement et maintenance d'applications web et mobiles."] },
      { id: "x2", title: "Développeur Web", company: "Tech Innov", start: "2022-01", end: "2023-01", bullets: ["Conception d'interfaces modernes et intégration API."] },
      { id: "x3", title: "Stagiaire Développeur", company: "WebFactory", start: "2021-01", end: "2022-01", bullets: ["Participation au développement de projets clients."] },
    ],
    skills: [
      { id: "s1", name: "HTML", level: 92 }, { id: "s2", name: "CSS", level: 90 }, { id: "s3", name: "JavaScript", level: 88 },
      { id: "s4", name: "React", level: 86 }, { id: "s5", name: "Next.js", level: 80 }, { id: "s6", name: "Node.js", level: 82 },
      { id: "s7", name: "MongoDB", level: 75 }, { id: "s8", name: "Tailwind CSS", level: 85 }, { id: "s9", name: "Docker", level: 70 }, { id: "s10", name: "Git", level: 88 },
    ],
    interests: [{ id: "i1", name: "Tech" }, { id: "i2", name: "Jeux vidéo" }, { id: "i3", name: "Lecture" }, { id: "i4", name: "Sport" }],
  }),
  "bongue-sidebar": preview({
    templateId: "bongue-sidebar",
    title: "Sidebar",
    identity: {
      firstName: "Mathis", lastName: "Bongue", title: "Développeur Full Stack",
      email: "mathis.bongue@email.com", phone: "+237 6 45 78 90 12", location: "Douala, Cameroun",
    },
    summary: "Créatif, rigoureux et passionné par les nouvelles technologies. J'aime résoudre des problèmes complexes et construire des produits utiles et évolutifs.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Innovatech", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web complètes avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Digital House", start: "2022-01", end: "2023-01", bullets: ["Développement de sites vitrines et e-commerce avec WordPress et WooCommerce."] },
      { id: "x3", title: "Stagiaire Développeur", company: "CodeLab", start: "2021-01", end: "2022-01", bullets: ["Participation à la conception et au développement de modules web."] },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Intermédiaire" }],
  }),
  "ngo-yellow": preview({
    templateId: "ngo-yellow",
    title: "Ngo'o",
    identity: {
      firstName: "Kévin", lastName: "Ngo'o", title: "Développeur Front-end",
      email: "kevin.ngoo@immail.com", phone: "+237 6 77 88 59 99", location: "Yaoundé, Cameroun",
      photo: "/images/templates/ngo.png", website: "linkedin.com/in/kevin-ngoo", github: "github.com/kevinngoo",
    },
    summary: "Je conçois des interfaces web modernes, performantes et accessibles. Mon objectif : offrir une excellente expérience utilisateur.",
    experiences: [
      { id: "x1", title: "Développeur Front-end", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement d'interfaces modernes et responsives."] },
      { id: "x2", title: "Intégrateur Web", company: "Freelance", start: "2022-01", end: "2023-01", bullets: ["Intégration de maquettes et optimisation SEO."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Assistance au développement front-end."] },
    ],
    skills: [
      { id: "s1", name: "HTML / CSS", level: 95 }, { id: "s2", name: "JavaScript", level: 90 }, { id: "s3", name: "React", level: 75 },
      { id: "s4", name: "Next.js", level: 60 }, { id: "s5", name: "Figma", level: 95 }, { id: "s6", name: "Git", level: 80 },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Professionnel" }],
  }),
  mbarga: preview({
    templateId: "mbarga",
    title: "Mbarga",
    identity: {
      firstName: "Nathan", lastName: "Mbarga", title: "Développeur Front-end",
      email: "nathan.mbarga@mail.com", phone: "+237 6 22 11 33 44", location: "Douala, Cameroun",
      photo: "/images/templates/mbarga.png", website: "linkedin.com/in/nathanmbarga", github: "github.com/nathanmbarga",
    },
    summary: "J'aime créer des interfaces modernes, élégantes et centrées sur l'expérience utilisateur.",
    experiences: [
      { id: "x1", title: "Frontend Developer", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["Interfaces modernes et accessibles."] },
      { id: "x2", title: "UI/UX Developer", company: "Web Agency", start: "2022-01", end: "2023-01", bullets: ["Prototypes et intégration."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Participation à des projets web."] },
    ],
    skills: [
      { id: "s1", name: "HTML / CSS", level: 92 }, { id: "s2", name: "JavaScript", level: 88 }, { id: "s3", name: "React", level: 85 },
      { id: "s4", name: "Tailwind CSS", level: 90 }, { id: "s5", name: "Figma", level: 80 },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Professionnel" }],
    interests: [{ id: "i1", name: "Tech" }, { id: "i2", name: "Design" }, { id: "i3", name: "Jeux vidéo" }, { id: "i4", name: "Sport" }],
  }),
  "photo-haut": preview({
    templateId: "photo-haut",
    title: "Portrait",
    identity: {
      firstName: "Enzo", lastName: "Tchinda", title: "Développeur Web",
      email: "enzo.tchinda@email.com", phone: "+237 6 45 78 90 12", location: "Douala, Cameroun",
      photo: "/images/templates/enzo-center.png",
    },
    summary: "Développeur web passionné par la création de solutions numériques utiles et efficaces. J'accorde une grande importance à la qualité du code et à l'expérience utilisateur.",
    experiences: [
      { id: "x1", title: "Développeur Web", company: "PixelDev", start: "2022-01", end: "", current: true, bullets: ["Développement de sites et d'applications web avec JavaScript, React et Node.js."] },
      { id: "x2", title: "Développeur Junior", company: "CodeLab", start: "2020-01", end: "2022-01", bullets: ["Intégration des maquettes, développement de fonctionnalités et maintenance."] },
    ],
    education: [{ id: "e1", diploma: "Licence en Informatique", school: "Université de Yaoundé I", year: "2017 à 2020" }],
  }),
  "elongou-typo": preview({
    templateId: "elongou-typo",
    title: "Typo",
    identity: {
      firstName: "David", lastName: "Eloungou", title: "Développeur Web",
      email: "david.eloungou@email.com", phone: "+237 6 56 78 90 12", location: "Yaoundé, Cameroun",
    },
    summary: "Je conçois et développe des applications web modernes, performantes et centrées sur l'utilisateur.",
    experiences: [
      { id: "x1", title: "Développeur Front-end", company: "Webify", start: "2023-01", end: "", current: true, bullets: ["Développement d'interfaces modernes avec React et intégration d'API REST."] },
      { id: "x2", title: "Développeur Web", company: "Kreativ Studio", start: "2021-01", end: "2023-01", bullets: ["Conception de sites web responsives et optimisés."] },
      { id: "x3", title: "Stagiaire Développeur", company: "Netgroup", start: "2020-01", end: "2021-01", bullets: ["Assistance à la maintenance et au développement de projets internes."] },
    ],
  }),
  "kouame-photo": preview({
    templateId: "kouame-photo",
    title: "Kouamé Photo",
    identity: {
      firstName: "Alexandre", lastName: "Kouamé", title: "Développeur Full Stack",
      email: "alexandre.kouame@mail.com", phone: "+237 6 78 45 22 11", location: "Douala, Cameroun",
      photo: "/images/templates/kouame-sq.png",
    },
    summary: "Développeur full stack motivé par la création de produits digitaux utiles et l'optimisation des performances.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Nexa Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Allk Digital", start: "2022-01", end: "2023-01", bullets: ["Conception de plateformes web et intégration d'API."] },
      { id: "x3", title: "Stagiaire Développeur", company: "DevHouse", start: "2020-01", end: "2022-01", bullets: ["Participation au développement de modules et aux tests."] },
    ],
  }),
  "amina-pastel": preview({
    templateId: "amina-pastel",
    title: "Pastel",
    identity: {
      firstName: "Amina", lastName: "Tchamda", title: "Développeuse Full Stack",
      email: "amina.tchamda@mail.com", phone: "+237 6 73 21 45 67", location: "Yaoundé, Cameroun",
      photo: "/images/templates/amina.png", website: "linkedin.com/in/aminatchamda", github: "github.com/aminatchamda",
    },
    summary: "Transformer des idées en expériences digitales mémorables.",
    experiences: [
      { id: "x1", title: "Full Stack Developer", company: "Tech Innov", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web et mobiles."] },
      { id: "x2", title: "Frontend Developer", company: "WebStudio", start: "2022-01", end: "2023-01", bullets: ["Interfaces modernes et responsives."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Participation à des projets web."] },
    ],
    skills: [
      { id: "s1", name: "JavaScript", level: 90 }, { id: "s2", name: "React", level: 88 }, { id: "s3", name: "Next.js", level: 82 },
      { id: "s4", name: "Node.js", level: 80 }, { id: "s5", name: "MongoDB", level: 75 }, { id: "s6", name: "PostgreSQL", level: 70 },
      { id: "s7", name: "Docker", level: 68 }, { id: "s8", name: "Figma", level: 85 },
    ],
    interests: [{ id: "i1", name: "Photographie" }, { id: "i2", name: "Lecture" }, { id: "i3", name: "Voyage" }, { id: "i4", name: "Cuisine" }],
  }),
  classique: preview({
    templateId: "classique",
    title: "Classique",
    identity: {
      firstName: "David", lastName: "Olomo", title: "Développeur Full Stack",
      email: "david.olomo@email.com", phone: "+237 6 74 35 21 98", location: "Yaoundé, Cameroun",
    },
    summary: "Développeur full stack orienté résultats avec une expérience dans la conception d'applications web robustes et évolutives.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "NextGen", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Webify", start: "2021-01", end: "2023-01", bullets: ["Création de sites web responsifs et dynamiques."] },
    ],
    education: [{ id: "e1", diploma: "Licence en Informatique", school: "Université de Douala", year: "2018 à 2021" }],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Intermédiaire" }],
  }),
  mvondo: preview({
    templateId: "mvondo",
    title: "Mvondo",
    identity: {
      firstName: "Darian", lastName: "Mvondo", title: "Développeur Full Stack",
      email: "darian.mvondo@mail.com", phone: "+237 6 91 23 45 67", location: "Douala, Cameroun",
      photo: "/images/templates/mvondo.png", website: "linkedin.com/in/darian-mvondo", github: "github.com/darianmvondo",
    },
    summary: "Développeur passionné avec un fort intérêt pour l'innovation et la création d'expériences digitales mémorables.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "Aveo Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web et mobiles."] },
      { id: "x2", title: "Développeur Front-end", company: "Web Agency", start: "2022-01", end: "2023-01", bullets: ["Interfaces modernes."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Participation à des projets."] },
    ],
    interests: [{ id: "i1", name: "Photographie" }, { id: "i2", name: "Voyage" }, { id: "i3", name: "Musique" }, { id: "i4", name: "Jeux vidéo" }],
  }),
  "enzo-dark": preview({
    templateId: "enzo-dark",
    title: "Enzo Dark",
    identity: {
      firstName: "Enzo", lastName: "Tchinda", title: "Développeur Back-end",
      email: "enzo.tchinda@mail.com", phone: "+237 6 45 67 89 01", location: "Yaoundé, Cameroun",
      photo: "/images/templates/enzo-dark.png", website: "linkedin.com/in/enzo-tchinda", github: "github.com/enzotchinda",
    },
    summary: "J'aime concevoir des architectures robustes et scalables. Passionné par le back-end, la sécurité et la performance.",
    experiences: [
      { id: "x1", title: "Développeur Back-end", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["APIs, bases de données, sécurité."] },
      { id: "x2", title: "Développeur Web", company: "Tech Innov", start: "2021-01", end: "2023-01", bullets: ["Développement d'APIs REST."] },
      { id: "x3", title: "Stagiaire", company: "WebFactory", start: "2021-01", end: "2021-06", bullets: ["Maintenance et optimisation."] },
    ],
    skills: [
      { id: "s1", name: "Node.js", level: 90 }, { id: "s2", name: "Express", level: 86 }, { id: "s3", name: "MongoDB", level: 82 },
      { id: "s4", name: "PostgreSQL", level: 78 }, { id: "s5", name: "Docker", level: 74 },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Professionnel" }],
    interests: [{ id: "i1", name: "Tech" }, { id: "i2", name: "Lecture" }, { id: "i3", name: "Sport" }],
  }),
  "amina-minimal": preview({
    templateId: "amina-minimal",
    title: "Amina",
    identity: {
      firstName: "Amina", lastName: "Nguena", title: "Développeuse Web",
      email: "amina.nguena@email.com", phone: "+237 6 33 22 11 44", location: "Yaoundé, Cameroun",
    },
    summary: "Développeuse web créative et rigoureuse, spécialisée dans la création de sites modernes, rapides et accessibles.",
    experiences: [
      { id: "x1", title: "Développeuse Web", company: "Bright Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement de sites web avec React et Tailwind CSS."] },
      { id: "x2", title: "Développeuse Junior", company: "Web Studio", start: "2021-01", end: "2023-01", bullets: ["Intégration des maquettes et développement de fonctionnalités frontend."] },
    ],
    education: [{ id: "e1", diploma: "Licence en Informatique", school: "Université de Yaoundé I", year: "2018 à 2021" }],
    skills: [
      { id: "s1", name: "HTML", level: 92 }, { id: "s2", name: "CSS", level: 90 }, { id: "s3", name: "JavaScript", level: 88 },
      { id: "s4", name: "React", level: 86 }, { id: "s5", name: "Tailwind CSS", level: 84 }, { id: "s6", name: "Git", level: 80 },
    ],
  }),
  "voundi-dark": preview({
    templateId: "voundi-dark",
    title: "Voundi Dark",
    identity: {
      firstName: "Samuel", lastName: "Voundi", title: "Développeur Full Stack",
      email: "samuel.voundi@mail.com", phone: "+237 6 54 32 10 98", location: "Douala, Cameroun",
      photo: "/images/templates/voundi.png", website: "linkedin.com/in/samuelvoundi", github: "github.com/samuelvoundi",
    },
    summary: "Passionné par l'innovation et les technologies web. Toujours à la recherche de nouveaux défis pour créer des solutions impactantes.",
    experiences: [
      { id: "x1", title: "Full Stack Developer", company: "Aves Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement et maintenance d'applications web."] },
      { id: "x2", title: "Backend Developer", company: "Tech Innov", start: "2022-01", end: "2023-01", bullets: ["APIs REST, bases de données."] },
      { id: "x3", title: "Stagiaire", company: "WebFactory", start: "2021-01", end: "2022-01", bullets: ["Participation à des projets."] },
    ],
    skills: [
      { id: "s1", name: "JavaScript", level: 90 }, { id: "s2", name: "TypeScript", level: 85 }, { id: "s3", name: "React", level: 88 },
      { id: "s4", name: "Node.js", level: 82 }, { id: "s5", name: "MongoDB", level: 78 }, { id: "s6", name: "Docker", level: 72 },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Professionnel" }],
  }),
  "voundi-editorial": preview({
    templateId: "voundi-editorial",
    title: "Voundi",
    identity: {
      firstName: "Samuel", lastName: "Voundi", title: "Développeur Web",
      email: "samuel.voundi@email.com", phone: "+237 6 98 76 54 32", location: "Douala, Cameroun",
    },
    summary: "J'aide les entreprises et les startups à construire des applications web simples, rapides et efficaces.",
    experiences: [
      { id: "x1", title: "Développeur Web", company: "Bright Agency", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web avec React et Tailwind CSS."] },
      { id: "x2", title: "Développeur Web", company: "WebPro Studio", start: "2022-01", end: "2023-01", bullets: ["Intégration de maquettes et développement front-end."] },
      { id: "x3", title: "Stagiaire Développeur", company: "StartCode", start: "2020-01", end: "2022-01", bullets: ["Assistance à la conception et au développement de solutions web."] },
    ],
  }),
  ndjock: preview({
    templateId: "ndjock",
    title: "Ndjock",
    identity: {
      firstName: "Daniel", lastName: "Ngo Ndjock", title: "Développeur Web & Mobile",
      email: "daniel.ngo.ndjock@mail.com", phone: "+237 6 79 11 22 33", location: "Yaoundé, Cameroun",
      photo: "/images/templates/ndjock.png", website: "linkedin.com/in/danielndjock", github: "github.com/danielndjock",
    },
    summary: "J'aime créer des produits digitaux qui allient design, performance et simplicité.",
    experiences: [
      { id: "x1", title: "Full Stack Developer", company: "Digital Solutions", start: "2023-01", end: "", current: true, bullets: ["Conception et développement d'applications web et mobiles."] },
      { id: "x2", title: "Frontend Developer", company: "WeCraftStudio", start: "2022-01", end: "2023-01", bullets: ["Interfaces modernes et responsives."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Maintenance de projets web."] },
    ],
    skills: [
      { id: "s1", name: "React", level: 90 }, { id: "s2", name: "Next.js", level: 84 }, { id: "s3", name: "Node.js", level: 82 },
      { id: "s4", name: "MongoDB", level: 76 }, { id: "s5", name: "Tailwind CSS", level: 88 }, { id: "s6", name: "Figma", level: 80 },
    ],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Professionnel" }],
    interests: [{ id: "i1", name: "Musique" }, { id: "i2", name: "Sport" }, { id: "i3", name: "Voyage" }],
  }),
  lateral: preview({
    templateId: "lateral",
    title: "Latéral",
    identity: {
      firstName: "Kevin", lastName: "Mekongo", title: "Développeur Full Stack",
      email: "kevin.mekongo@email.com", phone: "+237 6 19 28 45 67", location: "Douala, Cameroun",
      photo: "/images/templates/mekongo.png",
    },
    summary: "Développeur full stack passionné par les applications web performantes et scalables.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "TechHouse", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Web Innov", start: "2021-01", end: "2023-01", bullets: ["Création de sites, intégration d'API REST et maintenance."] },
    ],
    education: [{ id: "e1", diploma: "Licence en Informatique", school: "Université de Douala", year: "2018 à 2021" }],
    languages: [{ id: "l1", name: "Français", level: "Natif" }, { id: "l2", name: "Anglais", level: "Intermédiaire" }],
  }),
  essomba: preview({
    templateId: "essomba",
    title: "Essomba",
    identity: {
      firstName: "Rayan", lastName: "Essomba", title: "Développeur Web",
      email: "rayan.essomba@mail.com", phone: "+237 6 23 45 67 89", location: "Douala, Cameroun",
      photo: "/images/templates/essomba.png", website: "linkedin.com/in/rayan-essomba", github: "github.com/rayanessomba",
    },
    summary: "Développeur web passionné, j'aime transformer des idées en produits digitaux. Toujours à la recherche de nouveaux défis et d'opportunités d'apprentissage.",
    experiences: [
      { id: "x1", title: "Développeur Web", company: "Avex Solutions", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web."] },
      { id: "x2", title: "Freelance", company: "Web & Mobile", start: "2022-01", end: "2023-01", bullets: ["Projets clients divers."] },
      { id: "x3", title: "Stagiaire", company: "TechLab", start: "2021-01", end: "2022-01", bullets: ["Assistance au développement."] },
    ],
    skills: [
      { id: "s1", name: "HTML", level: 90 }, { id: "s2", name: "CSS", level: 88 }, { id: "s3", name: "JavaScript", level: 86 },
      { id: "s4", name: "React", level: 84 }, { id: "s5", name: "Node.js", level: 80 }, { id: "s6", name: "Figma", level: 75 },
    ],
    interests: [{ id: "i1", name: "Voyage" }, { id: "i2", name: "Photographie" }, { id: "i3", name: "Musique" }, { id: "i4", name: "Sport" }],
  }),
  "ngo-clean": preview({
    templateId: "ngo-clean",
    title: "Ngo Clean",
    identity: {
      firstName: "Kevin", lastName: "Ngo'o", title: "Développeur Full Stack",
      email: "kevin.ngoo@email.com", phone: "+237 6 77 88 99 00", location: "Yaoundé, Cameroun",
    },
    summary: "Développeur full stack passionné par la résolution de problèmes et la création d'expériences digitales de qualité.",
    experiences: [
      { id: "x1", title: "Développeur Full Stack", company: "SoftDev", start: "2023-01", end: "", current: true, bullets: ["Développement d'applications web avec React, Node.js et MongoDB."] },
      { id: "x2", title: "Développeur Web", company: "Digital House", start: "2022-01", end: "2023-01", bullets: ["Développement de sites vitrines et e-commerce."] },
      { id: "x3", title: "Stagiaire Développeur", company: "CodeLab", start: "2020-01", end: "2022-01", bullets: ["Participation au développement et aux tests d'applications."] },
    ],
    skills: [
      { id: "s1", name: "HTML / CSS", level: 92 }, { id: "s2", name: "JavaScript", level: 88 }, { id: "s3", name: "React", level: 86 },
      { id: "s4", name: "Node.js", level: 82 }, { id: "s5", name: "SQL", level: 78 },
    ],
  }),
};

export function previewCvForTemplate(templateId: string): CvData {
  return templatePreviews[templateId] ?? emptyCv({ templateId, title: templateId });
}
