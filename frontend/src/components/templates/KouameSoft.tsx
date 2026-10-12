import type { ReactNode } from "react";
import { Mail, MapPin, Phone, Plus } from "lucide-react";
import type { CvData } from "@/lib/cvTypes";
import { formatCvYearRange } from "@/lib/formatDate";
import { A4Page, ExtraFilledSections, SkillGlyph } from "@/components/templates/shared";
import { cn } from "@/lib/utils";

const INK = "#1B2A4A";
const ACCENT = "#3A5A97";
const BODY = "#4A4A4A";
const MUTED = "#8A93A3";
const SIDEBAR = "#EEF2F8";
const LINE = "#E4E8F0";
const TRACK = "#DDE3EC";

function displayName(cv: CvData) {
  const first = cv.identity.firstName.trim();
  const last = cv.identity.lastName.trim();
  return { first: first || "Prénom", last: last || "Nom" };
}

function initialsOf(cv: CvData) {
  const { first, last } = displayName(cv);
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "CV";
}

function stripUrl(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function languageWidth(level: string) {
  const value = level.toLowerCase();
  if (value.includes("natif") || value.includes("bilingue") || value.includes("c2")) return 100;
  if (value.includes("courant") || value.includes("c1")) return 82;
  if (value.includes("pro") || value.includes("b2")) return 80;
  if (value.includes("inter") || value.includes("b1")) return 70;
  const numeric = Number(level.replace("%", ""));
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 62;
}

function experienceText(bullets: string[]) {
  return bullets.filter(Boolean).join(" ");
}

function formatEducationYear(year: string) {
  return year.replace(/\s*[-–—]\s*/g, " à ");
}

export function KouameSoft({
  cv,
  className,
}: {
  cv: CvData;
  className?: string;
}) {
  const { first, last } = displayName(cv);
  const photo = cv.identity.photo;
  const contacts = [
    cv.identity.phone ? { key: "phone", label: cv.identity.phone } : null,
    cv.identity.email ? { key: "email", label: cv.identity.email } : null,
    cv.identity.location ? { key: "location", label: cv.identity.location } : null,
    cv.identity.website ? { key: "linkedin", label: stripUrl(cv.identity.website) } : null,
    cv.identity.github ? { key: "github", label: stripUrl(cv.identity.github) } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <A4Page className={cn("text-[12px]", className)} pageClassName="flex bg-white font-sans">
        <aside className="relative flex w-[268px] shrink-0 flex-col" style={{ background: SIDEBAR }}>
          <div
            data-cv-photo-frame
            className="relative h-[248px] w-full overflow-hidden"
            style={{ borderBottomRightRadius: "46%" }}
          >
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: "50% 18%" }}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center font-serif text-[42px] font-semibold text-white/85"
                style={{ background: "#2A3344" }}
              >
                {initialsOf(cv)}
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col px-[22px] pb-8 pt-[28px]">
            <SidebarHeading>Contact</SidebarHeading>
            <ul className="space-y-[11px]">
              {(contacts.length
                ? contacts
                : [
                    { key: "phone", label: "Téléphone" },
                    { key: "email", label: "Email" },
                    { key: "location", label: "Ville, Pays" },
                  ]
              ).map((item) => (
                <li key={item.key} className="flex items-center gap-[10px]">
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: INK }}
                  >
                    <ContactGlyph name={item.key} />
                  </span>
                  <span
                    className="min-w-0 break-all text-[11px] leading-[1.25]"
                    style={{ color: BODY }}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            {cv.skills.length ? (
              <>
            <SidebarHeading className="mt-[30px]">Compétences</SidebarHeading>
            <ul className="space-y-[11px]">
              {cv.skills.map((skill) => (
                <li key={skill.id} className="flex items-center gap-[10px]">
                  <SkillGlyph name={skill.name} icon={skill.icon} />
                  <span className="text-[12px] leading-none" style={{ color: INK }}>
                    {skill.name}
                  </span>
                </li>
              ))}
            </ul>
              </>
            ) : null}

            {cv.languages.length ? (
              <>
            <SidebarHeading className="mt-[30px]">Langues</SidebarHeading>
            <ul className="space-y-[12px]">
              {cv.languages.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="w-[72px] shrink-0 text-[12px] leading-none" style={{ color: INK }}>
                    {item.name}
                  </span>
                  <span className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${languageWidth(item.level)}%`, background: INK }}
                    />
                  </span>
                </li>
              ))}
            </ul>
              </>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col px-[34px] pb-10 pt-[38px]">
          <header>
            <h1
              className="font-serif text-[46px] font-semibold leading-[1.02] tracking-[-0.02em]"
              style={{ color: INK }}
            >
              <span className="block">{first}</span>
              <span className="block">{last}</span>
            </h1>
            <p
              className="mt-[12px] text-[15px] font-semibold leading-none"
              style={{ color: ACCENT }}
            >
              {cv.identity.title || "Titre du poste"}
            </p>
            {cv.summary.trim() ? (
            <p
              className="mt-[16px] max-w-[430px] text-[12.5px] leading-[1.55]"
              style={{ color: BODY }}
            >
              {cv.summary}
            </p>
            ) : null}
          </header>

          {cv.experiences.length ? (
          <SectionBlock title="Expériences" className="mt-[34px]">
            {cv.experiences.map((item) => (
              <TimelineEntry
                key={item.id}
                date={formatCvYearRange(item.start, item.end, item.current)}
                title={item.title}
                subtitle={item.company}
                body={experienceText(item.bullets)}
              />
            ))}
          </SectionBlock>
          ) : null}

          {cv.education.length ? (
          <SectionBlock title="Formation" className="mt-[8px]">
            {cv.education.map((item) => (
              <TimelineEntry
                key={item.id}
                date={formatEducationYear(item.year)}
                title={item.diploma}
                subtitle={item.school}
                body={item.details}
              />
            ))}
          </SectionBlock>
          ) : null}
          <ExtraFilledSections cv={cv} includeInterests />
        </div>
    </A4Page>
  );
}

function ContactGlyph({ name }: { name: string }) {
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

function SidebarHeading({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-[14px] text-[11.5px] font-extrabold uppercase tracking-[0.14em]",
        className,
      )}
      style={{ color: INK }}
    >
      {children}
    </h2>
  );
}

function SectionBlock({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section data-cv-section className={className}>
      <div className="flex items-center gap-[10px]">
        <span
          className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: INK }}
        >
          <Plus className="h-[11px] w-[11px]" strokeWidth={2.6} />
        </span>
        <h2
          data-cv-heading
          className="text-[12.5px] font-extrabold uppercase tracking-[0.12em]"
          style={{ color: INK }}
        >
          {title}
        </h2>
        <span className="h-px min-w-0 flex-1" style={{ background: LINE }} />
      </div>
      <div className="relative mt-[6px]">
        <span
          className="absolute bottom-3 top-[2px] w-px"
          style={{ left: 8.5, background: LINE }}
        />
        <div className="pt-[10px]">{children}</div>
      </div>
    </section>
  );
}

function TimelineEntry({
  date,
  title,
  subtitle,
  body,
}: {
  date: string;
  title: string;
  subtitle: string;
  body?: string;
}) {
  return (
    <div data-cv-keep className="relative pb-[20px] pl-[32px]">
      <span
        className="absolute top-[7px] h-[8px] w-[8px] rounded-full"
        style={{ left: 5, background: INK }}
      />
      <p className="text-[12px] font-medium leading-none" style={{ color: ACCENT }}>
        {date}
      </p>
      <p className="mt-[7px] text-[13.5px] font-bold leading-none" style={{ color: INK }}>
        {title}
      </p>
      <p className="mt-[6px] text-[12.5px] leading-none" style={{ color: MUTED }}>
        {subtitle}
      </p>
      {body ? (
        <p className="mt-[8px] max-w-[430px] text-[12px] leading-[1.5]" style={{ color: BODY }}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

