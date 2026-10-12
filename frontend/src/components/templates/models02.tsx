import type { ReactNode } from "react";
import type { CvData } from "@/lib/cvTypes";
import { formatCvYearRange } from "@/lib/formatDate";
import {
  A4Page,
  Bar,
  ContactGlyph,
  InterestIcon,
  Photo,
  SkillGlyph,
  cvContacts,
  displayName,
  experienceText,
  formatEducationYear,
  fullName,
  initialsOf,
  languageWidth,
  ExtraFilledSections,
} from "@/components/templates/shared";

const NAVY = "#1B2A4A";
const BLUE = "#3A5A97";
const LINE = "#C5D4E8";

export function ElongouEditorial({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv).slice(0, 3);
  return (
    <A4Page className={className} pageClassName="bg-[#F7F6F3] px-10 py-9 text-[#1B2A4A]">
      <header className="flex flex-col items-center text-center">
        <div className="h-[108px] w-[108px] overflow-hidden rounded-full ring-2 ring-[#1B2A4A]/20">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <h1 className="mt-4 font-serif text-[34px] font-semibold leading-none">{fullName(cv)}</h1>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#555]">
          {cv.identity.title || "Titre"}
        </p>
        <p className="mt-3 max-w-[520px] text-[12px] leading-relaxed text-[#555]">{cv.summary}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-5 text-[11px]">
          {contacts.map((c) => (
            <span key={c.key} className="flex items-center gap-2">
              <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-white" style={{ background: NAVY }}>
                <ContactGlyph name={c.key} />
              </span>
              {c.label}
            </span>
          ))}
        </div>
      </header>
      <div className="mt-8 grid grid-cols-[1fr_1.2fr] gap-8">
        <div>
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.1em]">Compétences</h2>
          <ul className="mt-3 space-y-2.5">
            {(cv.skills.length ? cv.skills : []).map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <SkillGlyph name={s.name} icon={s.icon} />
                <span className="w-[88px] text-[11.5px]">{s.name}</span>
                <span className="flex-1"><Bar value={s.level} track="#E4E8EE" fill={NAVY} /></span>
              </li>
            ))}
          </ul>
          <h2 className="mt-7 text-[12px] font-extrabold uppercase tracking-[0.1em]">Formation</h2>
          <div className="relative mt-3 border-l border-[#D5D8DE] pl-4">
            {(cv.education.length ? cv.education : []).map((e) => (
              <div key={e.id} className="relative mb-3">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: NAVY }} />
                <p className="text-[11px]" style={{ color: BLUE }}>{formatEducationYear(e.year)}</p>
                <p className="text-[12.5px] font-bold">{e.diploma}</p>
                <p className="text-[11.5px] text-[#777]">{e.school}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.1em]">Expériences</h2>
          <div className="relative mt-3 border-l border-[#D5D8DE] pl-4">
            {(cv.experiences.length ? cv.experiences : []).map((e) => (
              <div key={e.id} className="relative mb-4">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: NAVY }} />
                <p className="text-[11px]" style={{ color: BLUE }}>{formatCvYearRange(e.start, e.end, e.current)}</p>
                <p className="text-[13px] font-bold">{e.title}</p>
                <p className="text-[11.5px] text-[#777]">{e.company}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#555]">{experienceText(e.bullets)}</p>
              </div>
            ))}
          </div>
          <h2 className="mt-4 text-[12px] font-extrabold uppercase tracking-[0.1em]">Centres d&apos;intérêt</h2>
          <div className="mt-3 flex gap-5">
            {(cv.interests ?? []).slice(0, 4).map((i) => (
              <div key={i.id} className="flex flex-col items-center gap-1 text-[10px]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: NAVY, color: NAVY }}>
                  <InterestIcon name={i.name} icon={i.icon} />
                </span>
                {i.name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ExtraFilledSections cv={cv} />
    </A4Page>
  );
}

export function DeuxColonnes({ cv, className }: { cv: CvData; className?: string }) {
  return (
    <A4Page className={className} pageClassName="flex bg-white px-10 py-10 text-[#003366]">
      <aside className="w-[230px] shrink-0 pr-6">
        <div className="mx-auto h-[110px] w-[110px] overflow-hidden rounded-full">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <h2 className="mt-6 text-[11px] font-extrabold uppercase">Contact</h2>
        <span className="mt-1 block h-px w-10 bg-[#4A7AB5]" />
        <ul className="mt-3 space-y-1.5 text-[11.5px] text-[#333]">
          <li>{cv.identity.phone}</li>
          <li className="break-all">{cv.identity.email}</li>
          <li>{cv.identity.location}</li>
        </ul>
        <h2 className="mt-6 text-[11px] font-extrabold uppercase">Compétences</h2>
        <span className="mt-1 block h-px w-10 bg-[#4A7AB5]" />
        <ul className="mt-3 space-y-1 text-[12px] text-[#333]">
          {(cv.skills.length ? cv.skills : []).map((s) => <li key={s.id}>{s.name}</li>)}
        </ul>
        <h2 className="mt-6 text-[11px] font-extrabold uppercase">Langues</h2>
        <span className="mt-1 block h-px w-10 bg-[#4A7AB5]" />
        <ul className="mt-3 space-y-1 text-[12px] text-[#333]">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id}>{l.name} : {l.level}</li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 border-l pl-7" style={{ borderColor: LINE }}>
        <h1 className="text-[30px] font-extrabold leading-none">{fullName(cv)}</h1>
        <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#4A7AB5]">
          {cv.identity.title}
        </p>
        <span className="mt-2 block h-px w-12 bg-[#4A7AB5]" />
        <h2 className="mt-7 text-[12px] font-extrabold uppercase">Profil</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#444]">{cv.summary}</p>
        <hr className="my-5" style={{ borderColor: LINE }} />
        <h2 className="text-[12px] font-extrabold uppercase">Expériences</h2>
        {(cv.experiences.length ? cv.experiences : []).map((e) => (
          <div key={e.id} className="mt-3">
            <div className="flex justify-between gap-3">
              <p className="text-[13px] font-bold">{e.title} | {e.company}</p>
              <p className="shrink-0 text-[11.5px] text-[#777]">{formatCvYearRange(e.start, e.end, e.current)}</p>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-[#555]">{experienceText(e.bullets)}</p>
          </div>
        ))}
        <h2 className="mt-6 text-[12px] font-extrabold uppercase">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-2">
            <p className="text-[13px] font-bold">{e.diploma} | {e.school}</p>
            <p className="text-[11.5px] text-[#777]">{formatEducationYear(e.year)}</p>
          </div>
        ))}
        <ExtraFilledSections cv={cv} includeInterests />
      </div>
    </A4Page>
  );
}

export function MathisBongue({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-white text-[#111]">
      <aside className="w-[268px] shrink-0 px-6 pb-8 pt-0">
        <div className="h-[210px] w-full overflow-hidden bg-[#3A5BFF]" style={{ borderBottomLeftRadius: "46%", borderBottomRightRadius: "46%" }}>
          <Photo src={cv.identity.photo} name={initialsOf(cv)} className="object-[50%_15%]" />
        </div>
        <h2 className="mt-6 flex items-center gap-2 text-[13px] font-bold">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1E3A8A] text-[9px] text-white">+</span>
          Compétences
        </h2>
        <span className="mb-3 mt-1 block h-px bg-[#E5E7EB]" />
        <ul className="space-y-2">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-[12px]">
              <SkillGlyph name={s.name} icon={s.icon} size={16} /> {s.name}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[13px] font-bold">Langues</h2>
        <span className="mb-3 mt-1 block h-px bg-[#E5E7EB]" />
        <ul className="space-y-2">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id}>
              <div className="mb-1 flex justify-between text-[12px]"><span>{l.name}</span></div>
              <Bar value={languageWidth(l.level)} track="#E5E7EB" fill="#1E3A8A" />
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 px-8 py-8">
        <h1 className="text-[32px] font-extrabold leading-none text-[#1E3A8A]">{fullName(cv)}</h1>
        <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#3B82F6]">{cv.identity.title}</p>
        <ul className="mt-4 space-y-2">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-[11.5px]">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1E3A8A] text-white">
                <ContactGlyph name={c.key} />
              </span>
              {c.label}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] font-bold">Profil</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#444]">{cv.summary}</p>
        <h2 className="mt-6 text-[13px] font-bold">Expériences</h2>
        <span className="mb-3 mt-1 block h-px bg-[#E5E7EB]" />
        <div className="relative border-l-2 border-[#1E3A8A] pl-4">
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-4">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#1E3A8A]" />
              <p className="text-[11px] text-[#3B82F6]">{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold">{e.title}</p>
              <p className="text-[12px] text-[#666]">{e.company}</p>
              <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <h2 className="text-[13px] font-bold">Formation</h2>
        <span className="mb-3 mt-1 block h-px bg-[#E5E7EB]" />
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mb-2 pl-4">
            <p className="text-[11px] text-[#3B82F6]">{formatEducationYear(e.year)}</p>
            <p className="text-[13px] font-bold">{e.diploma}</p>
            <p className="text-[12px] text-[#666]">{e.school}</p>
          </div>
        ))}
        <h2 className="mt-4 text-[13px] font-bold">Centres d&apos;intérêt</h2>
        <div className="mt-3 flex gap-6 text-[10px]">
          {(cv.interests ?? []).slice(0, 4).map((i) => (
            <div key={i.id} className="flex flex-col items-center gap-1">
              <InterestIcon name={i.name} icon={i.icon} />
              {i.name}
            </div>
          ))}
        </div>
        <ExtraFilledSections cv={cv} />
      </div>
    </A4Page>
  );
}

export function BongueSidebar({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-white text-black">
      <aside className="w-[240px] shrink-0 bg-[#F5F5F5] px-7 py-10">
        <Ruled title="Contact">
          <p>{cv.identity.phone}</p>
          <p className="break-all">{cv.identity.email}</p>
          <p>{cv.identity.location}</p>
        </Ruled>
        <Ruled title="Compétences">
          {(cv.skills.length ? cv.skills : []).map((s) => <p key={s.id}>{s.name}</p>)}
        </Ruled>
        <Ruled title="Langues">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <p key={l.id}>{l.name} ({l.level.toLowerCase()})</p>
          ))}
        </Ruled>
      </aside>
      <div className="min-w-0 flex-1 px-10 py-10">
        <h1 className="text-[28px] font-extrabold uppercase tracking-[0.04em]">{first} {last}</h1>
        <p className="mt-1 text-[12px] uppercase tracking-[0.16em]">{cv.identity.title}</p>
        <span className="mt-3 block h-px w-16 bg-black" />
        <h2 className="mt-8 text-[12px] font-extrabold uppercase">Profil</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
        <hr className="my-6 border-black" />
        <h2 className="text-[12px] font-extrabold uppercase">Expériences</h2>
        {(cv.experiences.length ? cv.experiences : []).map((e) => (
          <div key={e.id} className="mt-3 grid grid-cols-[110px_1fr] gap-3">
            <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
            <div>
              <p className="text-[13px] font-bold">{e.title} · {e.company}</p>
              <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
            </div>
          </div>
        ))}
        <hr className="my-6 border-black" />
        <h2 className="text-[12px] font-extrabold uppercase">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-3 grid grid-cols-[110px_1fr] gap-3">
            <p className="text-[12px]">{formatEducationYear(e.year)}</p>
            <p className="text-[13px]"><span className="font-bold">{e.diploma}</span> · {e.school}</p>
          </div>
        ))}
        <ExtraFilledSections cv={cv} includeInterests />
      </div>
    </A4Page>
  );
}

function Ruled({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-cv-section className="mb-7 text-[12px] leading-relaxed">
      <div className="border-y border-black py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]">{title}</div>
      <div className="mt-3 space-y-1">{children}</div>
    </section>
  );
}
