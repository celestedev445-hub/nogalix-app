import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnalyseRewriteModal, type AnalyseRewriteSource } from "@/components/cv/AnalyseRewriteModal";
import { ScoreRing } from "@/components/cv/ScoreRing";
import type { CvMatchAnalysis } from "@/lib/cvMatchAnalysis";
import { verdictTone } from "@/lib/cvMatchAnalysis";
import { cn } from "@/lib/utils";

export function AnalyseResultSheet({
  open,
  onOpenChange,
  result,
  jobOffer,
  rewriteSource,
  onOpenAssistant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CvMatchAnalysis | null;
  jobOffer: string;
  rewriteSource: AnalyseRewriteSource | null;
  onOpenAssistant: () => void;
}) {
  const [rewriteOpen, setRewriteOpen] = useState(false);

  if (!result) return null;

  const tone = verdictTone(result.verdict);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto border-gris sm:max-w-lg">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="font-display text-xl font-bold text-navy">
              Votre CV correspond-il à l&apos;offre ?
            </SheetTitle>
            <SheetDescription className="text-sm text-navy/60">
              {result.cvLabel}
              {result.jobTitle ? ` · ${result.jobTitle}` : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="rounded-2xl bg-[#F8FAFC] p-5 text-center">
              <div className="flex flex-col items-center gap-4">
                <ScoreRing
                  value={result.matchScore}
                  size={120}
                  stroke={10}
                  trackClassName="text-gris"
                  barClassName={tone.ring}
                >
                  <p className="font-display text-3xl font-extrabold leading-none text-navy">
                    {result.matchScore}
                  </p>
                  <p className="text-[11px] text-navy/45">/100</p>
                </ScoreRing>
                <div>
                  <span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-semibold", tone.badge)}>
                    {result.verdictLabel}
                  </span>
                  <p className="mt-3 text-sm leading-relaxed text-navy/70">{result.summary}</p>
                  <p className="mt-2 text-xs text-navy/45">
                    {result.source === "ai" ? "Analyse IA" : "Analyse automatique"}
                  </p>
                </div>
              </div>
            </div>

            {result.actions.length ? (
              <section>
                <p className="mb-2 text-sm font-semibold text-navy">Modifications à faire sur votre CV</p>
                <p className="mb-3 text-xs text-navy/50">
                  L&apos;offre sert de référence. Seul votre CV est à modifier.
                </p>
                <ul className="space-y-2">
                  {result.actions.map((item) => (
                    <li key={item.title} className="rounded-xl border border-principale/15 bg-indigo-clair/30 px-3 py-3">
                      <div className="flex gap-2">
                        <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-principale" />
                        <div>
                          <p className="text-sm font-medium text-navy">{item.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-navy/65">{item.detail}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.alignedPoints.length ? (
              <section>
                <p className="mb-2 text-sm font-semibold text-navy">Déjà aligné avec l&apos;offre</p>
                <ul className="space-y-2">
                  {result.alignedPoints.map((item) => (
                    <li key={item} className="flex gap-2 rounded-xl bg-emerald-50/70 px-3 py-2.5 text-sm text-navy/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-succes" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.gaps.length ? (
              <section>
                <p className="mb-2 text-sm font-semibold text-navy">À ajouter ou renforcer dans votre CV</p>
                <ul className="space-y-2">
                  {result.gaps.map((item) => (
                    <li key={item} className="flex gap-2 rounded-xl bg-amber-50/80 px-3 py-2.5 text-sm text-navy/75">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="flex flex-col gap-2 pb-4">
              <Button type="button" className="h-11 rounded-xl" onClick={() => setRewriteOpen(true)}>
                Réécrire mon CV
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
                onClick={onOpenAssistant}
              >
                <Sparkles className="h-4 w-4" />
                M&apos;aider à modifier mon CV avec l&apos;IA
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AnalyseRewriteModal
        open={rewriteOpen}
        onOpenChange={setRewriteOpen}
        result={result}
        jobOffer={jobOffer}
        source={rewriteSource}
      />
    </>
  );
}
