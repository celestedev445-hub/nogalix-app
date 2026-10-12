import { Suspense } from "react";
import { ConvertView } from "@/components/vitrine/ConvertView";

export default function ConvertirPage() {
  return (
    <Suspense>
      <ConvertView />
    </Suspense>
  );
}
