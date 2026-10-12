import { Suspense } from "react";
import { ContactView } from "@/components/vitrine/ContactView";

export default function ContactPage() {
  return (
    <Suspense>
      <ContactView />
    </Suspense>
  );
}
