import { Mail, MapPin, Phone } from "lucide-react";
import { getCvIcon } from "@/lib/cvIcons";
import type { CvData } from "@/lib/cvTypes";
import { formatCvYearRange } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

export { A4Page, PAGE_H, PAGE_W } from "@/components/templates/PaginatedA4";

export function displayName(cv: CvData) {
  const first = cv.identity.firstName.trim();
  const last = cv.identity.lastName.trim();
  return { first: first || "Prénom", last: last || "Nom" };
}

export function fullName(cv: CvData) {
  const { first, last } = displayName(cv);
  return `${first} ${last}`.trim();
}

export function initialsOf(cv: CvData) {
  const { first, last } = displayName(cv);
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "CV";
}

export function stripUrl(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function languageWidth(level: string) {
  const value = level.toLowerCase();
  if (value.includes("natif") || value.includes("bilingue") || value.includes("c2")) return 100;
  if (value.includes("courant") || value.includes("c1")) return 82;
  if (value.includes("pro") || value.includes("b2")) return 80;
  if (value.includes("inter") || value.includes("b1")) return 70;
  const numeric = Number(level.replace("%", ""));
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 62;
}

export function experienceText(bullets: string[]) {
  return bullets.filter(Boolean).join(" ");
}

export function formatEducationYear(year: string) {
  return year.replace(/\s*[-–—]\s*/g, " à ");
}

export function yearRange(cvStart: string, cvEnd: string, current?: boolean) {
  return formatCvYearRange(cvStart, cvEnd, current);
}

export function Photo({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  if (src) {
    return <img data-cv-photo src={src} alt="" className={cn("h-full w-full object-cover", className)} />;
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-[#2A3344] text-white", fallbackClassName)}>
      {name}
    </div>
  );
}

export function ContactGlyph({ name }: { name: string }) {
  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-[11px] w-[11px]" fill="currentColor" aria-hidden>
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.28v1.56h.05c.46-.87 1.57-1.79 3.24-1.79 3.47 0 4.11 2.28 4.11 5.25v6.43zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
      </svg>
    );
  }
  if (name === "github") {
    return (
      <svg viewBox="0 0 24 24" className="h-[12px] w-[12px]" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.54 2.36 1.1 2.93.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85.01 1.71.11 2.51.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86v2.76c0 .26.18.57.69.48A10 10 0 0 0 12 2z" />
      </svg>
    );
  }
  const Icon = name === "email" ? Mail : name === "location" ? MapPin : Phone;
  return <Icon className="h-[11px] w-[11px]" strokeWidth={2.2} />;
}

export function cvContacts(cv: CvData) {
  return [
    cv.identity.phone ? { key: "phone", label: cv.identity.phone } : null,
    cv.identity.email ? { key: "email", label: cv.identity.email } : null,
    cv.identity.location ? { key: "location", label: cv.identity.location } : null,
    cv.identity.website ? { key: "linkedin", label: stripUrl(cv.identity.website) } : null,
    cv.identity.github ? { key: "github", label: stripUrl(cv.identity.github) } : null,
  ].filter(Boolean) as { key: string; label: string }[];
}

export function SkillGlyph({
  name,
  icon,
  size = 18,
  className,
}: {
  name: string;
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = getCvIcon(name, icon);
  if (!Icon) return null;
  return <Icon className={cn("shrink-0", className)} size={size} strokeWidth={1.8} aria-hidden />;
}

export function Bar({
  value,
  track,
  fill,
  height = 6,
}: {
  value: number;
  track: string;
  fill: string;
  height?: number;
}) {
  return (
    <span className="block overflow-hidden rounded-full" style={{ height, background: track }}>
      <span className="block h-full rounded-full" style={{ width: `${value}%`, background: fill }} />
    </span>
  );
}

export function ExtraFilledSections({
  cv,
  includeInterests = false,
  headingClassName = "mt-6 text-[12.5px] font-extrabold uppercase tracking-[0.08em]",
}: {
  cv: CvData;
  includeInterests?: boolean;
  headingClassName?: string;
}) {
  const projects = cv.projects.filter((item) => item.name.trim());
  const certifications = cv.certifications.filter((item) => item.name.trim());
  const references = (cv.references ?? []).filter((item) => item.name.trim());
  const interests = includeInterests
    ? (cv.interests ?? []).filter((item) => item.name.trim())
    : [];
  if (!projects.length && !certifications.length && !interests.length && !references.length) return null;
  return (
    <>
      {projects.length ? (
        <section data-cv-section className="mt-5">
          <h2 data-cv-heading className={headingClassName}>
            Projets
          </h2>
          {projects.map((item) => (
            <div key={item.id} data-cv-keep className="mt-2">
              <p className="text-[13px] font-bold leading-snug">{item.name}</p>
              {item.description.trim() ? (
                <p className="mt-0.5 text-[12px] leading-relaxed opacity-80">{item.description}</p>
              ) : null}
              {item.url?.trim() ? (
                <p className="mt-0.5 text-[11px] opacity-70">{stripUrl(item.url)}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {certifications.length ? (
        <section data-cv-section className="mt-5">
          <h2 data-cv-heading className={headingClassName}>
            Certifications
          </h2>
          {certifications.map((item) => (
            <div key={item.id} data-cv-keep className="mt-2">
              <p className="text-[13px] font-bold leading-snug">{item.name}</p>
              <p className="mt-0.5 text-[12px] opacity-80">
                {[item.issuer, item.year].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </section>
      ) : null}
      {references.length ? (
        <section data-cv-section className="mt-5">
          <h2 data-cv-heading className={headingClassName}>
            Références
          </h2>
          {references.map((item) => (
            <div key={item.id} data-cv-keep className="mt-2">
              <p className="text-[13px] font-bold leading-snug">{item.name}</p>
              {[item.role, item.company].filter((value) => value?.trim()).length ? (
                <p className="mt-0.5 text-[12px] opacity-80">
                  {[item.role, item.company].filter((value) => value?.trim()).join(" · ")}
                </p>
              ) : null}
              {[item.phone, item.email].filter((value) => value?.trim()).length ? (
                <p className="mt-0.5 text-[11px] opacity-70">
                  {[item.phone, item.email].filter((value) => value?.trim()).join(" · ")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {interests.length ? (
        <section data-cv-section className="mt-5">
          <h2 data-cv-heading className={headingClassName}>
            Centres d&apos;intérêt
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {interests.map((item) => (
              <span key={item.id} data-cv-keep className="inline-flex items-center gap-1.5 text-[12px]">
                <InterestIcon name={item.name} icon={item.icon} />
                {item.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function InterestIcon({
  name,
  icon,
  className,
}: {
  name: string;
  icon?: string | null;
  className?: string;
}) {
  const Icon = getCvIcon(name, icon);
  if (!Icon) return null;
  return <Icon className={cn("h-4 w-4 shrink-0", className)} strokeWidth={1.8} aria-hidden />;
}
