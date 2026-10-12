import type { ReactNode } from "react";
import type { CvData } from "@/lib/cvTypes";
import { ImportedCvPaper } from "@/components/templates/ImportedCvPaper";
import { IMPORT_ORIGINAL_TEMPLATE_ID } from "@/lib/importedCv";
import { KouameSoft } from "@/components/templates/KouameSoft";
import { LucasNdame, NdiayeMinimal, SimpleColonne } from "@/components/templates/models01";
import { BongueSidebar, DeuxColonnes, ElongouEditorial, MathisBongue } from "@/components/templates/models02";
import { ElongouTypo, NathanMbarga, NgoYellow, PhotoHaut } from "@/components/templates/models03";
import { AminaPastel, ClassiqueSimple, DarianMvondo, KouamePhoto } from "@/components/templates/models04";
import { AminaMinimal, EnzoDark, VoundiDark, VoundiEditorial } from "@/components/templates/models05";
import { DanielNdjock, LateralGauche, NgoClean, RayanEssomba } from "@/components/templates/models06";

const RENDERERS: Record<string, (cv: CvData, className?: string) => ReactNode> = {
  atlas: (cv, className) => <KouameSoft cv={cv} className={className} />,
  ndame: (cv, className) => <LucasNdame cv={cv} className={className} />,
  "simple-colonne": (cv, className) => <SimpleColonne cv={cv} className={className} />,
  ndiaye: (cv, className) => <NdiayeMinimal cv={cv} className={className} />,
  "elongou-editorial": (cv, className) => <ElongouEditorial cv={cv} className={className} />,
  "deux-colonnes": (cv, className) => <DeuxColonnes cv={cv} className={className} />,
  bongue: (cv, className) => <MathisBongue cv={cv} className={className} />,
  "bongue-sidebar": (cv, className) => <BongueSidebar cv={cv} className={className} />,
  "ngo-yellow": (cv, className) => <NgoYellow cv={cv} className={className} />,
  mbarga: (cv, className) => <NathanMbarga cv={cv} className={className} />,
  "photo-haut": (cv, className) => <PhotoHaut cv={cv} className={className} />,
  "elongou-typo": (cv, className) => <ElongouTypo cv={cv} className={className} />,
  "kouame-photo": (cv, className) => <KouamePhoto cv={cv} className={className} />,
  "amina-pastel": (cv, className) => <AminaPastel cv={cv} className={className} />,
  classique: (cv, className) => <ClassiqueSimple cv={cv} className={className} />,
  mvondo: (cv, className) => <DarianMvondo cv={cv} className={className} />,
  "enzo-dark": (cv, className) => <EnzoDark cv={cv} className={className} />,
  "amina-minimal": (cv, className) => <AminaMinimal cv={cv} className={className} />,
  "voundi-dark": (cv, className) => <VoundiDark cv={cv} className={className} />,
  "voundi-editorial": (cv, className) => <VoundiEditorial cv={cv} className={className} />,
  ndjock: (cv, className) => <DanielNdjock cv={cv} className={className} />,
  lateral: (cv, className) => <LateralGauche cv={cv} className={className} />,
  essomba: (cv, className) => <RayanEssomba cv={cv} className={className} />,
  "ngo-clean": (cv, className) => <NgoClean cv={cv} className={className} />,
  [IMPORT_ORIGINAL_TEMPLATE_ID]: (cv, className) => <ImportedCvPaper cv={cv} className={className} />,
};

/** Bundle synchrone — galerie / landing, pour éviter un flash de miniatures. */
export function CvPaperEager({
  cv,
  className,
}: {
  cv: CvData;
  className?: string;
}) {
  const render = RENDERERS[cv.templateId] ?? RENDERERS.atlas;
  return (
    <div key={cv.templateId} className="contents">
      {render(cv, className)}
    </div>
  );
}
