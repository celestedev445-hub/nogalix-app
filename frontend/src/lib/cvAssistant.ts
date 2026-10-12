import type { CvData } from "@/lib/cvTypes";

/** Payload CV envoyé à l'assistant (sans photo lourde). */
export function snapshotCvForAssistant(cv: CvData) {
  return {
    ...cv,
    identity: { ...cv.identity, photo: undefined },
  };
}
