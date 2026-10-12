import { Suspense } from "react";
import { NewCvView } from "@/components/cv/NewCvView";

export default function NewCvPage() {
  return (
    <Suspense>
      <NewCvView />
    </Suspense>
  );
}
