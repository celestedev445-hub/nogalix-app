/**
 * Build du site Nogalix (React + Tailwind) en fichiers statiques, servis par le
 * serveur Python unique (backend/app/web). En développement, `npm run dev`
 * (port 3000) relaie l'API et les routes serveur vers ce serveur (port 8010).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "node:zlib";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const backend = process.env.NOGALIX_SERVER_URL || "http://127.0.0.1:8010";
const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const routeTableFile = fileURLToPath(new URL("./src/app/routes.json", import.meta.url));

/** Copie la table des routes dans dist/.vite/ pour le serveur Python (SEO, 404, gardes, préchargements). */
function routeTablePlugin(): Plugin {
  return {
    name: "nogalix-route-table",
    apply: (_, env) => env.command === "build" && !env.isSsrBuild,
    generateBundle() {
      this.emitFile({ type: "asset", fileName: ".vite/routes.json", source: readFileSync(routeTableFile, "utf8") });
    },
  };
}

/** Versions .br et .gz des fichiers texte, servies telles quelles par le serveur Python. */
function precompressPlugin(): Plugin {
  let outDir = "dist";
  const compressible = /\.(js|mjs|css|json|svg|txt|webmanifest|map|xml)$/i;
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  return {
    name: "nogalix-precompress",
    apply: (_, env) => env.command === "build" && !env.isSsrBuild,
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      for (const file of walk(outDir)) {
        if (!compressible.test(file) || file.includes(".vite")) continue;
        const data = readFileSync(file);
        if (data.length < 1024) continue;
        writeFileSync(`${file}.gz`, gzipSync(data, { level: 9 }));
        writeFileSync(
          `${file}.br`,
          brotliCompressSync(data, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }),
        );
      }
    },
  };
}

const proxied = ["/api", "/storage", "/_image", "/app-config.js", "/manifest.webmanifest"];

export default defineConfig({
  plugins: [react(), routeTablePlugin(), precompressPlugin()],
  resolve: {
    alias: { "@": srcDir },
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: Object.fromEntries(proxied.map((path) => [path, { target: backend, changeOrigin: false }])),
  },
  preview: {
    port: 3000,
  },
  // Pré-rendu (vite build --ssr src/entry-server.tsx) : tout est regroupé, exécuté par Node à la compilation.
  ssr: {
    noExternal: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
    target: "es2020",
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        // Regroupe les très petits morceaux (icônes…) : moins de requêtes par page.
        experimentalMinChunkSize: 20_000,
        // React et le routeur changent rarement : fichier séparé, conservé en cache entre deux versions du site.
        manualChunks(id) {
          if (/node_modules[\/](react|react-dom|scheduler|react-router)[\/]/.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
});
