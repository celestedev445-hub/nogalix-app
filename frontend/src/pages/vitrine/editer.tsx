import { Suspense } from "react";
import { ConvertView } from "@/components/vitrine/ConvertView";

export default function EditerPage() {
  return (
    <Suspense>
      <ConvertView intent="edit" />
    </Suspense>
  );
}
