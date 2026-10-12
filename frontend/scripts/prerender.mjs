/**
 * Pré-rendu des pages (après `vite build` et `vite build --ssr`).
 * Écrit dist/.vite/prerender/*.html + index.json, lus par le serveur Python (backend/app/web/site.py).
 *
 * Configuration publique utilisée pour le rendu : variable NOGALIX_PUBLIC_CONFIG (JSON) ou fichier
 * .prerender-config.json (écrit par start.bat depuis backend/.env), sinon valeurs par défaut. Le serveur n'utilise le pré-rendu que si sa propre configuration donne le
 * même affichage (empreinte enregistrée dans index.json) ; sinon la page est rendue par le navigateur.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "dist", ".vite", "prerender");
const routeTable = JSON.parse(readFileSync(join(root, "src", "app", "routes.json"), "utf8"));

// Valeurs effectives d'appConfig qui changent l'affichage initial des pages
// (même calcul côté serveur : backend/app/web/public_config.py → render_fingerprint).
const RENDER_KEYS = [
  "name",
  "shortName",
  "assistantName",
  "assistantFirstName",
  "contactEmail",
  "supportEmail",
  "contactPhone",
  "cbcName",
  "cbcUrl",
];

let config = {};
try {
  const fromFile = join(root, ".prerender-config.json");
  const raw = process.env.NOGALIX_PUBLIC_CONFIG || (existsSync(fromFile) ? readFileSync(fromFile, "utf8") : "{}");
  config = JSON.parse(raw);
} catch {
  console.warn("[prerender] configuration publique illisible : valeurs par défaut utilisées.");
}
globalThis.__NOGALIX_CONFIG__ = config;

const { render, appConfig } = await import(pathToFileURL(join(root, "dist-ssr", "entry-server.js")).href);

/** Retire les préchargements que React place en tête du rendu : le serveur les met dans <head>. */
function stripLeadingResources(html) {
  return html.replace(/^(\s*<link\b[^>]*>)+/, "");
}

const fileName = (path) => (path === "/" ? "index" : path.slice(1).replace(/\//g, "__")) + ".html";

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pages = {};
const failures = [];
// Routes à paramètre (/cv/:id…) : rendues avec une valeur témoin ; gardées seulement si le HTML
// initial ne dépend pas du paramètre (il sert alors pour toutes les valeurs).
const PARAM = "__nogalix_param__";
const targets = [...routeTable.routes.map((route) => route.path), "/__404__"];

for (const pattern of targets) {
  const path = pattern.replace(/:[^/]+/g, PARAM);
  try {
    const html = stripLeadingResources(await render(path));
    if (html.includes(PARAM)) {
      console.log(`[prerender] ${pattern} dépend de son paramètre : rendue par le navigateur.`);
      continue;
    }
    const key = pattern === "/__404__" ? "*" : pattern;
    const file = fileName(pattern === "/__404__" ? "/404" : pattern.replace(/:/g, "_"));
    writeFileSync(join(outDir, file), html, "utf8");
    pages[key] = file;
  } catch (error) {
    failures.push(pattern);
    console.warn(`[prerender] ${pattern} non pré-rendue (rendue par le navigateur) : ${error?.message || error}`);
  }
}

const fingerprint = Object.fromEntries(RENDER_KEYS.map((key) => [key, String(appConfig[key] ?? "")]));
writeFileSync(join(outDir, "index.json"), JSON.stringify({ renderKeys: RENDER_KEYS, config: fingerprint, pages }, null, 2));
console.log(`[prerender] ${Object.keys(pages).length} pages pré-rendues${failures.length ? `, ${failures.length} ignorées` : ""}.`);
