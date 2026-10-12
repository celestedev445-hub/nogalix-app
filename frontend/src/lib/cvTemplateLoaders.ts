import type { ComponentType } from "react";
import type { CvData } from "@/lib/cvTypes";
import { IMPORT_ORIGINAL_TEMPLATE_ID } from "@/lib/importedCv";

export type CvPaperProps = {
  cv: CvData;
  className?: string;
};

type TemplateLoader = () => Promise<ComponentType<CvPaperProps>>;

const loaders: Record<string, TemplateLoader> = {
  atlas: () => import("@/components/templates/KouameSoft").then((m) => m.KouameSoft),
  ndame: () => import("@/components/templates/models01").then((m) => m.LucasNdame),
  "simple-colonne": () => import("@/components/templates/models01").then((m) => m.SimpleColonne),
  ndiaye: () => import("@/components/templates/models01").then((m) => m.NdiayeMinimal),
  "elongou-editorial": () => import("@/components/templates/models02").then((m) => m.ElongouEditorial),
  "deux-colonnes": () => import("@/components/templates/models02").then((m) => m.DeuxColonnes),
  bongue: () => import("@/components/templates/models02").then((m) => m.MathisBongue),
  "bongue-sidebar": () => import("@/components/templates/models02").then((m) => m.BongueSidebar),
  "ngo-yellow": () => import("@/components/templates/models03").then((m) => m.NgoYellow),
  mbarga: () => import("@/components/templates/models03").then((m) => m.NathanMbarga),
  "photo-haut": () => import("@/components/templates/models03").then((m) => m.PhotoHaut),
  "elongou-typo": () => import("@/components/templates/models03").then((m) => m.ElongouTypo),
  "kouame-photo": () => import("@/components/templates/models04").then((m) => m.KouamePhoto),
  "amina-pastel": () => import("@/components/templates/models04").then((m) => m.AminaPastel),
  classique: () => import("@/components/templates/models04").then((m) => m.ClassiqueSimple),
  mvondo: () => import("@/components/templates/models04").then((m) => m.DarianMvondo),
  "enzo-dark": () => import("@/components/templates/models05").then((m) => m.EnzoDark),
  "amina-minimal": () => import("@/components/templates/models05").then((m) => m.AminaMinimal),
  "voundi-dark": () => import("@/components/templates/models05").then((m) => m.VoundiDark),
  "voundi-editorial": () => import("@/components/templates/models05").then((m) => m.VoundiEditorial),
  ndjock: () => import("@/components/templates/models06").then((m) => m.DanielNdjock),
  lateral: () => import("@/components/templates/models06").then((m) => m.LateralGauche),
  essomba: () => import("@/components/templates/models06").then((m) => m.RayanEssomba),
  "ngo-clean": () => import("@/components/templates/models06").then((m) => m.NgoClean),
  [IMPORT_ORIGINAL_TEMPLATE_ID]: () =>
    import("@/components/templates/ImportedCvPaper").then((m) => m.ImportedCvPaper),
};

const resolved = new Map<string, ComponentType<CvPaperProps>>();
const inflight = new Map<string, Promise<ComponentType<CvPaperProps>>>();

export function resolveCvTemplateId(templateId: string) {
  return loaders[templateId] ? templateId : "atlas";
}

export function getLoadedCvTemplate(templateId: string) {
  return resolved.get(resolveCvTemplateId(templateId)) ?? null;
}

export function preloadCvTemplate(templateId: string) {
  const id = resolveCvTemplateId(templateId);
  const ready = resolved.get(id);
  if (ready) return Promise.resolve(ready);

  const existing = inflight.get(id);
  if (existing) return existing;

  const loader = loaders[id] ?? loaders.atlas;
  const pending = loader().then((component) => {
    resolved.set(id, component);
    inflight.delete(id);
    return component;
  });
  inflight.set(id, pending);
  return pending;
}

export function preloadCvTemplates(templateIds: Iterable<string>) {
  const unique = new Set(Array.from(templateIds, resolveCvTemplateId));
  for (const id of unique) {
    void preloadCvTemplate(id);
  }
}
