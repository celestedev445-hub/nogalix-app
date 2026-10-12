import type { ReactNode } from "react";
import { appConfig } from "@/lib/appConfig";
import { cn } from "@/lib/utils";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function LegalArticle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className={cn("mx-auto max-w-3xl space-y-4 rounded-xl bg-white p-6 text-navy md:p-8", cardShadow)}>
      <p className="text-sm font-medium text-principale">{appConfig.name}</p>
      <h1 className="font-display text-3xl font-bold title-logo">{title}</h1>
      {children}
    </article>
  );
}
