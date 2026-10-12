import { Suspense } from "react";
import { CandidatureView } from "@/components/cv/CandidatureView";

export default function CandidaturePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-navy/55">Chargement…</div>}>
      <CandidatureView />
    </Suspense>
  );
}
