import type { ReactNode } from "react";
import type { CvData } from "@/lib/cvTypes";
import { formatCvYearRange } from "@/lib/formatDate";
import {
  A4Page,
  Bar,
  ContactGlyph,
  InterestIcon,
  Photo,
  cvContacts,
  displayName,
  experienceText,
  formatEducationYear,
  fullName,
  initialsOf,
  languageWidth,
  ExtraFilledSections,
} from "@/components/templates/shared";

const BLUE = "#4A90E2";
const NAVY = "#0B1220";

export function LucasNdame({ cv, className }: { cv: CvData; className?: string }) {
  const name = fullName(cv);
  const contacts = cvContacts(cv);
  const skills = cv.skills;
  const langs = cv.languages;
  const interests = cv.interests ?? [];

  return (
    <A4Page className={className} pageClassName="flex flex-col" >
      <div className="flex min-h-[1123px]" style={{ background: NAVY }}>
        <aside className="flex w-[268px] shrink-0 flex-col px-[22px] pb-8 pt-[22px] text-white">
          <div className="mb-6 h-[118px] w-[118px] overflow-hidden rounded-full ring-[3px]" style={{ boxShadow: `0 0 0 3px ${BLUE}` }}>
            <Photo src={cv.identity.photo} name={initialsOf(cv)} className="object-[50%_20%]" />
          </div>
          <SideTitle>Contact</SideTitle>
          <ul className="space-y-[10px] text-[11px]">
            {contacts.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[#0B1220]">
                  <ContactGlyph name={c.key} />
                </span>
                <span className="min-w-0 break-all leading-tight">{c.label}</span>
              </li>
            ))}
          </ul>
          {skills.length ? (
            <>
              <SideTitle className="mt-7">Compétences</SideTitle>
              <ul className="space-y-[9px]">
                {skills.map((s) => (
                  <li key={s.id}>
                    <p className="mb-1 text-[11px]">{s.name}</p>
                    <Bar value={s.level} track="#1A2744" fill={BLUE} height={5} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {langs.length ? (
            <>
              <SideTitle className="mt-7">Langues</SideTitle>
              <ul className="space-y-[9px]">
                {langs.map((l) => (
                  <li key={l.id}>
                    <p className="mb-1 text-[11px]">{l.name}</p>
                    <Bar value={languageWidth(l.level)} track="#1A2744" fill={BLUE} height={5} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-8 pb-4 pt-10 text-white">
            <p className="font-script text-[52px] leading-none">{name}</p>
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.18em]">
              {cv.identity.title || "Titre du poste"}
            </p>
          </div>
          <div className="flex-1 rounded-tl-[36px] bg-white px-8 py-7 text-[#1A1A1A]">
            {cv.summary.trim() ? (
              <section data-cv-section>
                <MainTitle>À propos</MainTitle>
                <p className="mt-2 text-[12px] leading-relaxed text-[#4A4A4A]">{cv.summary}</p>
              </section>
            ) : null}
            {cv.experiences.length ? (
              <section data-cv-section className="mt-6">
                <MainTitle>Expériences</MainTitle>
                <div className="relative mt-3 border-l border-[#D8DEE8] pl-5">
                  {cv.experiences.map((item) => (
                    <div key={item.id} data-cv-keep className="relative mb-4">
                      <span className="absolute -left-[23px] top-1 h-2 w-2 rounded-full" style={{ background: NAVY }} />
                      <p className="text-[11px] font-medium" style={{ color: BLUE }}>
                        {formatCvYearRange(item.start, item.end, item.current)}
                      </p>
                      <p className="mt-1 text-[13px] font-bold">{item.title}</p>
                      <p className="text-[12px] text-[#666]">{item.company}</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[#4A4A4A]">{experienceText(item.bullets)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {cv.education.length ? (
              <section data-cv-section className="mt-4">
                <MainTitle>Formation</MainTitle>
                <div className="relative mt-3 border-l border-[#D8DEE8] pl-5">
                  {cv.education.map((item) => (
                    <div key={item.id} data-cv-keep className="relative mb-3">
                      <span className="absolute -left-[23px] top-1 h-2 w-2 rounded-full" style={{ background: NAVY }} />
                      <p className="text-[11px] font-medium" style={{ color: BLUE }}>{formatEducationYear(item.year)}</p>
                      <p className="mt-1 text-[13px] font-bold">{item.diploma}</p>
                      <p className="text-[12px] text-[#666]">{item.school}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {interests.length ? (
              <section data-cv-section className="mt-4">
                <MainTitle>Centres d&apos;intérêt</MainTitle>
                <div className="mt-3 flex gap-6">
                  {interests.slice(0, 4).map((item) => (
                    <div key={item.id} data-cv-keep className="flex flex-col items-center gap-1 text-[10px]">
                      <InterestIcon name={item.name} icon={item.icon} className="h-5 w-5" />
                      {item.name}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <ExtraFilledSections cv={cv} />
          </div>
        </div>
      </div>
    </A4Page>
  );
}

function SideTitle({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={`mb-3 text-[11px] font-extrabold uppercase tracking-[0.16em] ${className ?? ""}`}>
      {children}
      <span className="mt-1 block h-px w-full bg-white/35" />
    </h2>
  );
}

function MainTitle({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={`text-[12px] font-extrabold uppercase tracking-[0.12em] ${className ?? ""}`}>
      {children}
      <span className="mt-1 block h-px w-full bg-[#E5E7EB]" />
    </h2>
  );
}

export function SimpleColonne({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[56px] py-[48px] text-black">
      <header className="flex items-center gap-5">
        <div className="h-[86px] w-[86px] overflow-hidden rounded-full bg-[#E5E7EB]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <div>
          <h1 className="text-[28px] font-extrabold leading-none">{first} {last}</h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.14em]">{cv.identity.title || "Titre du poste"}</p>
          <p className="mt-2 text-[11.5px] text-[#333]">
            {cv.identity.email} | {cv.identity.phone}
          </p>
          <p className="text-[11.5px] text-[#333]">{cv.identity.location}</p>
        </div>
      </header>
      <hr className="my-6 border-[#E5E7EB]" />
      {cv.summary.trim() ? <Section title="Profil">{cv.summary}</Section> : null}
      {cv.experiences.length ? (
        <Section title="Expériences">
          {cv.experiences.map((item) => (
            <Row key={item.id} left={`${item.title} | ${item.company}`} right={formatCvYearRange(item.start, item.end, item.current)} body={experienceText(item.bullets)} />
          ))}
        </Section>
      ) : null}
      {cv.education.length ? (
        <Section title="Formation">
          {cv.education.map((item) => (
            <Row key={item.id} left={`${item.diploma} | ${item.school}`} right={formatEducationYear(item.year)} />
          ))}
        </Section>
      ) : null}
      {cv.skills.length ? (
        <Section title="Compétences">
          {cv.skills.map((s) => s.name).join(", ")}
        </Section>
      ) : null}
      <Section title="Contact">
        {[cv.identity.email, cv.identity.phone, cv.identity.location].filter(Boolean).join(" | ")}
      </Section>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

export function NdiayeMinimal({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[58px] py-[52px] text-black">
      <h1 className="text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.04em]">
        <span className="block">{first}</span>
        <span className="block">{last}</span>
      </h1>
      <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.16em]">{cv.identity.title || "Titre du poste"}</p>
      {cv.summary.trim() ? (
        <p className="mt-4 max-w-[520px] text-[12.5px] leading-relaxed">{cv.summary}</p>
      ) : null}
      {cv.experiences.length ? (
        <>
          <hr className="my-6 border-black" />
          <p className="text-[12px] font-extrabold uppercase">Expériences</p>
          <div className="mt-3 space-y-4">
            {cv.experiences.map((item) => (
              <div key={item.id} data-cv-keep className="grid grid-cols-[130px_1fr] gap-4">
                <p className="text-[12px]">{formatCvYearRange(item.start, item.end, item.current)}</p>
                <div>
                  <p className="text-[13px] font-bold">{item.title} · {item.company}</p>
                  <p className="mt-1 text-[12px] leading-relaxed">{experienceText(item.bullets)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {cv.education.length ? (
        <>
          <hr className="my-6 border-black" />
          <p className="text-[12px] font-extrabold uppercase">Formation</p>
          <div className="mt-3 space-y-3">
            {cv.education.map((item) => (
              <div key={item.id} data-cv-keep className="grid grid-cols-[130px_1fr] gap-4">
                <p className="text-[12px]">{formatEducationYear(item.year)}</p>
                <p className="text-[13px]"><span className="font-bold">{item.diploma}</span> · {item.school}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {cv.skills.length ? (
        <>
          <hr className="my-6 border-black" />
          <p className="text-[12px] font-extrabold uppercase">Compétences</p>
          <p className="mt-3 flex flex-wrap gap-x-8 text-[12.5px]">
            {cv.skills.map((s) => (
              <span key={s.id}>{s.name}</span>
            ))}
          </p>
        </>
      ) : null}
      <hr className="my-6 border-black" />
      <p className="text-[12px] font-extrabold uppercase">Contact</p>
      <div className="mt-3 flex justify-between text-[12px]">
        <span>{cv.identity.phone}</span>
        <span>{cv.identity.email}</span>
        <span>{cv.identity.location}</span>
      </div>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-cv-section className="mb-6">
      <h2 className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.08em]">{title}</h2>
      <div className="text-[12.5px] leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ left, right, body }: { left: string; right: string; body?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-4">
        <p><span className="font-bold">{left.split(" | ")[0]}</span> {left.includes(" | ") ? `| ${left.split(" | ")[1]}` : ""}</p>
        <p className="shrink-0 text-[12px]">{right}</p>
      </div>
      {body ? <p className="mt-1 text-[12px] text-[#333]">{body}</p> : null}
    </div>
  );
}
