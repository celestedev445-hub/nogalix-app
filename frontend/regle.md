# Frontend — Nogalix

Règle **uniquement frontend**. Texte utilisateur toujours en **français**.

Application web **Nogalix** pour **créer un CV automatiquement** : choix d’un modèle, saisie classique **ou** assistant IA (texte et voix), aperçu, sauvegarde et export.

---

## 1. Produit

- L’utilisateur choisit un **template**.
- Il crée son CV **en saisissant** (formulaires) **ou en parlant** à l’assistant, au choix.
- L’assistant accepte aussi le **clavier** dans le même fil.
- Aperçu live, enregistrement, export (PDF / impression) selon l’API.

Nom de l’app : **Nogalix**. Nom affiché et prénom de l’assistante : `src/lib/appConfig.ts` et `src/lib/assistant.ts`, lus depuis la configuration publique injectée par le serveur (`.env` du backend). Ne pas les durcir dans les vues ni ailleurs.

### Identité — fichiers sources (racine du repo)

Ces fichiers sont **obligatoires**. Ne pas les remplacer par des placeholders, des icônes génériques ou des visuels inventés.

| Fichier | Rôle |
| --- | --- |
| **`logo.png`** | **Logo officiel** Nogalix (icône + wordmark). Unique source : header, auth, footer, splash, `appConfig`. |
| **`favicon_io/`** | **Favicons** à prendre tels quels (voir liste ci-dessous). Copier vers `public/` et brancher dans `index.html` (manifeste servi par le serveur : `backend/app/web/site.py`). |
| **`maquettes/`** | **Maquettes d’écrans** — référence visuelle unique. Le design du site **doit** s’y calquer. |

**Favicons** (`favicon_io/`) : `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`. Ne pas générer d’autres favicons.

**Design** : le dossier **`maquettes/`** est la **source unique** des écrans et du visuel. S’y baser **obligatoirement** (layouts, cartes, hiérarchie, mood). Ne pas inventer un autre look. En cas d’écart avec une autre section de cette règle, **les maquettes priment** pour le visuel.

| Fichier | Écran |
| --- | --- |
| `maquettes/01_accueil.png` | Accueil / dashboard |
| `maquettes/02_assistant_ia_editeur_cv.png` | Assistant IA + éditeur CV |
| `maquettes/03_modeles_cv.png` | Modèles de CV |
| `maquettes/04_analyse_ia.png` | Analyse IA |
| `maquettes/05_plans.png` | Plans / tarifs |
| `maquettes/06_mon_profil.png` | Mon profil |

---

## 2. Stack

| Couche | Choix |
| --- | --- |
| Framework | **React + Vite** (SPA compilée en fichiers statiques) + **React Router** ; servie par le serveur Python unique (`backend/app/web`) |
| UI | **React 19**, **TypeScript** ; mélange `.tsx` / `.js` : garder l’extension du fichier touché |
| Styles | **Tailwind 3** + `tailwindcss-animate` + `cn()` (`clsx` + `tailwind-merge`) |
| Primitives | **shadcn + Radix** dans `src/components/ui/` |
| Formulaires | **react-hook-form** + **zod** + `@hookform/resolvers` |
| État | **Zustand** (auth, connexion, interface) |
| API | **`makeRequest`** uniquement ; même serveur (`/api/*`), session par cookie HttpOnly |
| Toasts | `@/hooks/use-toast` + `Toaster` global |
| Icônes | **lucide-react** (`react-icons` en complément si déjà dans le kit) |
| Motion | **framer-motion** |
| Dates | **date-fns** locale `fr` |
| i18n | **i18next** / `react-i18next` si le fichier l’utilise déjà |
| Auth Google | `GoogleAuthButton` / `GoogleAuthSection` (GSI) |
| PWA | manifeste servi par le serveur, `public/sw.js`, `PwaInstallActions` |
| Autres | garder les libs du `package.json` (Radix, cmdk, embla, recharts, tiptap, stripe, echo, etc.) |

Alias : `@/` → `src/`.

Navigation : `@/platform/link`, `@/platform/navigation`, `@/platform/image`, `@/platform/dynamic`. Ne pas importer `react-router` directement dans les vues.

Ne pas ajouter MUI, Chakra, Ant Design ni un second système de toasts.

---

## 3. Structure

```
index.html       ← page unique (balises SEO remplies par le serveur selon la route)
src/main.tsx     ← point d'entrée
src/app/
  router.tsx     ← arborescence des routes et mises en page
  routes.json    ← titres, descriptions, routes protégées (partagé avec le serveur Python)
  ClientRoot.tsx
  globals.css
  layouts/
src/pages/
  vitrine/       ← public : accueil, modèles, auth, légal, contact, faq
  modules/       ← connecté : espace membre
  admin/
src/platform/    ← Link, navigation, Image, dynamic, SEO, défilement
src/styles/      ← polices auto-hébergées
src/components/
  ui/            ← primitives (ne pas contourner)
  cv/
  templates/
  assistant/
  vitrine/
  features/
  auth/
  pwa/
src/lib/
src/store/
src/services/
src/hooks/
```

### Config

- `package.json`, `vite.config.ts` (build, proxy de développement vers le serveur 8010)
- `tailwind.config.ts`, `postcss.config.cjs`, `tsconfig.json`
- Aucune variable d’environnement côté frontend : nom de l’app, client id Google, Turnstile, OnlyOffice… viennent du `.env` du backend (`backend/app/web/public_config.py`). Aucune de ces valeurs en dur dans le code.

### Shell

- `index.html` + `src/styles/fonts.css` — polices **Inter** + **Nunito** auto-hébergées, balises SEO, **favicons** issus de `favicon_io/`
- `src/app/ClientRoot.tsx` — `initializeAuth`, `Toaster`, `RegisterServiceWorker`, `ConnectionGate`, `SessionTimeout`, `ConsoleBrand`
- `src/app/globals.css` — variables shadcn alignées sur la charte ci-dessous
- Protection des routes (cookie HttpOnly `authToken`) : serveur (`backend/app/web/site.py`) au chargement, `src/app/router.tsx` lors des navigations

### Lib, auth, API

- `makeRequest.tsx`, `apiUrl.ts`, `cookies.js`, `utils.ts` (`cn`)
- `appConfig.ts`, `sessionExpired.js`, `applyAuthSession.js`, `googleAuth.js`, `networkError.ts`
- `charte.ts` — tokens layout + couleurs
- Stores : `authStore`, `connectionStore`, `interfaceStore`
- Services : `auth`, `profile`, `assistant`, `cv`, `templates`
- Hooks : `use-toast`, `use-mobile`, `use-hydrated`, `usePwaInstall`

La mise en page des modules (`router.tsx`) enveloppe `ModulesShell` : **menu haut arrondi**, jamais une colonne latérale.

---

## 4. Charte graphique

**Référence visuelle obligatoire** : dossier **`maquettes/`**. Logo : **`logo.png`** uniquement.

Tokens dans `tailwind.config.ts`, `src/lib/charteColors.ts` et `charte.ts`.  
Classes Tailwind (`bg-principale`, `text-navy`, …), **pas** de hex dans les vues.

| Token | Hex | Usage |
| --- | --- | --- |
| `principale` | `#3A83F7` | Primaire. Boutons, actions, liens, état actif, focus |
| `indigo` / `secondaire` | `#4338CA` | Accent. Badges, icônes, focus fort, dégradés |
| `navy` / `quatrieme` | `#0F172A` | Texte principal, titres, navigation, contenus importants |
| `gris` / `troisieme` | `#E2E8F0` | Bordures, séparateurs, contours cartes et champs |
| `indigo-clair` / `surface` | `#EEF2FF` | Fond secondaire, sections mises en avant, survol léger |
| `succes` | `#10B981` | Validation, CV terminé, sauvegarde, profil complété |

Fond de page : blanc. Texte long : `text-navy/80`.

```ts
'gradient-brand': 'linear-gradient(135deg, #3A83F7 0%, #4338CA 100%)',
'gradient-brand-soft': 'linear-gradient(135deg, rgba(58,131,247,0.12) 0%, rgba(67,56,202,0.08) 100%)',
boxShadow.brand: '0 4px 20px -4px rgba(58, 131, 247, 0.35)',
```

Variables CSS (`globals.css`) :

- `--primary` → `#3A83F7` (≈ `217 92% 60%`)
- `--foreground` → `#0F172A` (≈ `222 47% 11%`)
- `--border` / `--input` → `#E2E8F0` (≈ `214 32% 91%`)
- `--accent` → `#EEF2FF` (≈ `226 100% 97%`)
- `--ring` → primaire ou indigo
- succès → `#10B981` (≈ `160 84% 39%`)
- `--radius` : `0.75rem` ou `1rem` (menu pilule)

Boutons primaires : `bg-principale text-white hover:bg-principale/90`.  
Bouton succès : `bg-succes`.  
Liens : `text-principale`.  
Nav active : `bg-indigo-clair text-principale`.

---

## 5. Navigation — menu arrondi en haut

Pas de barre latérale dans le shell. Pas de `SidebarProvider` / colonne gauche.

Barre **sticky en haut**, conteneur **pilule** (`rounded-full` ou `rounded-[2rem]`), centrée, fond blanc / `indigo-clair`, bordure `gris`, ombre légère.

- gauche : **`logo.png`** + nom (`appConfig`)
- centre (desktop) : Tableau de bord, Mes CV, Modèles, Assistant, Profil
- droite : notifications, avatar + `dropdown-menu`
- mobile : même pilule ; liens dans un **`Sheet`**

Le contenu commence sous la barre. Header vitrine et footer : même charte, même esprit arrondi.

```tsx
<header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
  <nav className="mx-auto flex max-w-6xl items-center gap-2 rounded-full border border-gris bg-white/90 px-3 py-2 shadow-brand backdrop-blur-md">
    {/* logo | liens | actions */}
  </nav>
</header>
```

`src/components/ui/sidebar.tsx` peut exister dans le kit ; **ne pas le monter**.

---

## 6. Assistant IA + voix

Un seul chat : widget flottant (dock, historique `sessionStorage` / `localStorage`, indicateur de frappe).

API texte : `src/services/assistant.ts` → `makeRequest("assistant/chat", "POST", { message, history, zone })`.  
Zones : `"vitrine" | "app"`.  
Copies d’accueil dans `src/lib/assistant.ts` : templates, sections du CV, export, saisie vs voix.

### Nouveau CV — deux modes (choix dès l’écran)

1. **Saisie** — wizard (identité, expériences, formations, compétences, langues) : `react-hook-form` + `zod` + `ui/`.
2. **Voix** — l’utilisateur parle ; l’IA structure le CV et alimente les champs. Le clavier reste disponible dans le même fil.

### Voix

- **Micro** : `MediaRecorder` ou Web Speech ; sinon envoi de l’audio au backend. Icônes lucide `Mic` / `MicOff`.
- **Lecture** : TTS après le texte (API backend, repli `speechSynthesis`). Bouton muet. Le texte s’affiche toujours.
- Conversation **tour par tour** sauf si le backend expose un flux live.
- Pas de micro sans geste utilisateur. Si permission refusée : message en français.
- Tout propos oral est aussi écrit dans le fil.

---

## 7. Routes

**(vitrine)** : `/`, `/modeles`, `/faq`, `/contact`, pages légales, `/auth/login`, `/auth/signup`.

**(modules)** (session requise) :

| Chemin | Rôle |
| --- | --- |
| `/dashboard` | Accueil, CTA Nouveau CV (saisie / voix) |
| `/cv` | Liste des CV |
| `/cv/nouveau` | Template + mode saisie ou vocal |
| `/cv/[id]` | Éditeur + aperçu live |
| `/modeles` | Galerie de templates |
| `/profil` | Compte |
| `/notifications` | Notifications |

Pages minces dans `src/pages/` (déclarées dans `src/app/routes.json`) ; vues dans `src/components/cv/` et `src/components/templates/`.

---

## 8. Templates

- Grille `ui/card` + `badge`.
- Choix avant ou pendant l’édition ; changer de modèle **sans** perdre les données.
- Aperçu type « papier » (`border-gris`, ombre). Les couleurs du CV imprimé appartiennent au template, pas au chrome de l’app.
- L’assistant peut **proposer** un modèle ; l’utilisateur confirme.

---

## 9. Conventions

### API

```ts
import { makeRequest } from "@/lib/makeRequest";
return makeRequest("cv", "GET", null, true, true);
```

Pas de `fetch` dispersé, pas d’axios.  
`requiresToken: true` dès que la route est authentifiée. Erreurs : messages issus de `makeRequest`.

### Env — rien de sensible en dur

**Aucune information sensible en dur** dans le code (clés, tokens, secrets, IDs clients, URLs d’API, credentials, webhooks). Tout passe par le `.env` du backend ; ce qui doit être public est transmis au navigateur par `public_config.py`.

- Lire via `appConfig.ts` / helpers, jamais `window.__NOGALIX_CONFIG__` dispersé dans les vues.
- `.env.example` : noms des variables, **sans** valeurs secrètes.
- Jamais de secret dans le repo, les commentaires, les tests, ou la configuration publique (clés privées interdites côté client, ex. `GEMINI_*`).

### Formulaires et toasts

Mutation importante → `toast` (`success` / `destructive` / `default`), libellés en français. Bouton d’envoi **disabled** + loader pendant l’appel.

```ts
import { toast } from "@/hooks/use-toast";

toast({ title: "CV enregistré", description: "Votre CV est à jour.", variant: "success" });
```

Un seul `Toaster` dans `ClientRoot`.

### Composants

- Primitives : `@/components/ui/...` + `cn()`.
- Métier : `components/cv/`, `components/templates/`, `components/assistant/`, `components/vitrine/`.
- Exceptions : Google, Turnstile, aperçu PDF / canvas.

### Qualité

- Labels, focus, clavier (dialogs Radix).
- Respecter `prefers-reduced-motion`.
- Pas de refactor hors demande.
- Pas de clé privée dans la configuration publique. Pas de secret, URL d’API ou identifiant sensible écrit en dur.

---

## 10. Checklist

1. Charte § 4 dans `tailwind.config.ts` et `globals.css`.
2. Shell = **menu haut arrondi**, pas de colonne latérale.
3. Assistant unique, **texte + voix**, modes saisie / vocal pour créer un CV.
4. `makeRequest`, `ui/`, stores, toasts, auth, PWA comme ci-dessus.
5. Pages et composants limités au métier CV (templates, éditeur, profil, assistant).
6. Marque **Nogalix** partout (titres, metadata, PWA). Rien de sensible en dur : env uniquement.
7. Logo = **`logo.png`**. Favicons = **`favicon_io/`**. UI = dossier **`maquettes/`** (obligatoire, pas d’autre look).
