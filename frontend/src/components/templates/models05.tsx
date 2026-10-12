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

export function EnzoDark({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-black text-white">
      <aside className="w-[270px] shrink-0 px-6 pb-8 pt-6">
        <div className="h-[210px] w-full overflow-hidden rounded-[28px] bg-[#222]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} className="grayscale" />
        </div>
        <h2 className="mt-6 text-[13px] font-bold">À propos</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-white/80">{cv.summary}</p>
        <h2 className="mt-6 text-[13px] font-bold">Compétences</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <span key={s.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black">
              {s.name}
            </span>
          ))}
        </div>
        <h2 className="mt-6 text-[13px] font-bold">Langues</h2>
        <ul className="mt-3 space-y-2">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id}>
              <div className="mb-1 flex justify-between text-[12px]"><span>{l.name}</span></div>
              <Bar value={languageWidth(l.level)} track="#333" fill="#fff" />
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 rounded-tl-[36px] bg-white px-8 py-8 text-black">
        <h1 className="text-[30px] font-extrabold leading-none">{fullName(cv)}</h1>
        <p className="mt-2 text-[12px] uppercase tracking-[0.14em]">{cv.identity.title}</p>
        <ul className="mt-4 space-y-1.5 text-[11.5px]">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black text-white">
                <ContactGlyph name={c.key} />
              </span>
              {c.label}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[13px] font-bold">Expériences</h2>
        <div className="relative mt-3 border-l border-black/20 pl-4">
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-3 rounded-2xl bg-[#F3F4F6] p-3">
              <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-black" />
              <p className="text-[11px] text-[#555]">{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold">{e.title}</p>
              <p className="text-[12px]">{e.company}</p>
              <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <h2 className="text-[13px] font-bold">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-2">
            <p className="text-[11px] text-[#555]">{formatEducationYear(e.year)}</p>
            <p className="text-[13px] font-bold">{e.diploma}</p>
            <p className="text-[12px]">{e.school}</p>
          </div>
        ))}
        <h2 className="mt-4 text-[13px] font-bold">Centres d&apos;intérêt</h2>
        <div className="mt-3 flex gap-6 text-[10px]">
          {(cv.interests ?? []).slice(0, 3).map((i) => (
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

export function AminaMinimal({ cv, className }: { cv: CvData; className?: string }) {
  return (
    <A4Page className={className} pageClassName="bg-white px-[56px] py-[48px] text-black">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold">{fullName(cv)}</h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.12em]">{cv.identity.title}</p>
          <span className="mt-3 block h-px w-20 bg-black" />
        </div>
        <div className="text-right text-[12px] leading-relaxed">
          <p>{cv.identity.email}</p>
          <p>{cv.identity.phone}</p>
          <p>{cv.identity.location}</p>
        </div>
      </header>
      <h2 className="mt-10 text-[12px] font-extrabold uppercase">Profil</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
      <h2 className="mt-8 text-[12px] font-extrabold uppercase">Expériences</h2>
      {(cv.experiences.length ? cv.experiences : []).map((e) => (
        <div key={e.id} className="mt-3">
          <div className="flex justify-between">
            <p><span className="font-bold">{e.title}</span> | {e.company}</p>
            <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
          </div>
          <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
        </div>
      ))}
      <h2 className="mt-8 text-[12px] font-extrabold uppercase">Formation</h2>
      {(cv.education.length ? cv.education : []).map((e) => (
        <div key={e.id} className="mt-2 flex justify-between">
          <p><span className="font-bold">{e.diploma}</span> | {e.school}</p>
          <p className="text-[12px]">{formatEducationYear(e.year)}</p>
        </div>
      ))}
      <h2 className="mt-8 text-[12px] font-extrabold uppercase">Compétences</h2>
      <p className="mt-2 text-[12.5px]">{(cv.skills.length ? cv.skills : []).map((s) => s.name).join(", ")}</p>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

export function VoundiDark({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv).slice(0, 3);
  return (
    <A4Page className={className} pageClassName="relative bg-[#121212] text-white">
      <div className="flex h-[420px] px-10 pt-10">
        <div className="flex-1">
          <h1 className="font-serif text-[42px] leading-[1.02]">
            <span className="block">{displayName(cv).first}</span>
            <span className="block">{displayName(cv).last}</span>
          </h1>
          <p className="mt-3 text-[12px] uppercase tracking-[0.16em]">{cv.identity.title}</p>
          <p className="mt-4 max-w-[340px] text-[12.5px] leading-relaxed text-white/80">{cv.summary}</p>
          <ul className="mt-5 space-y-2 text-[12px]">
            {contacts.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-black">
                  <ContactGlyph name={c.key} />
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="h-full w-[280px] overflow-hidden">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} className="h-full grayscale object-cover object-top" />
        </div>
      </div>
      <div className="relative -mt-[60px] grid grid-cols-2 gap-8 rounded-t-[40px] bg-white px-10 py-8 text-[#1B2A4A]">
        <div>
          <h2 className="text-[13px] font-bold">Compétences</h2>
          <ul className="mt-3 space-y-2">
            {(cv.skills.length ? cv.skills : []).map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <SkillGlyph name={s.name} icon={s.icon} size={16} />
                <span className="w-[80px] text-[11.5px]">{s.name}</span>
                <span className="flex-1"><Bar value={s.level} track="#E8E8E8" fill="#1B2A4A" /></span>
              </li>
            ))}
          </ul>
          <h2 className="mt-5 text-[13px] font-bold">Langues</h2>
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <div key={l.id} className="mt-2">
              <p className="mb-1 text-[12px]">{l.name}</p>
              <Bar value={languageWidth(l.level)} track="#E8E8E8" fill="#1B2A4A" />
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-[13px] font-bold">Expériences</h2>
          <div className="relative mt-3 border-l-2 border-[#3A7BD5] pl-4">
            {(cv.experiences.length ? cv.experiences : []).map((e) => (
              <div key={e.id} className="relative mb-3">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#3A7BD5]" />
                <p className="text-[11px] text-[#3A7BD5]">{formatCvYearRange(e.start, e.end, e.current)}</p>
                <p className="text-[13px] font-bold">{e.title}</p>
                <p className="text-[12px] text-[#666]">{e.company}</p>
                <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
              </div>
            ))}
          </div>
          <h2 className="text-[13px] font-bold">Formation</h2>
          {(cv.education.length ? cv.education : []).map((e) => (
            <div key={e.id} className="mt-2">
              <p className="text-[11px] text-[#3A7BD5]">{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px] text-[#666]">{e.school}</p>
            </div>
          ))}
        </div>
      </div>
      <ExtraFilledSections cv={cv} />
    </A4Page>
  );
}

export function VoundiEditorial({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[48px] py-[44px] text-black">
      <div className="grid grid-cols-[1.1fr_1fr] gap-8 border-b border-[#E5E7EB] pb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em]">{cv.identity.title}</p>
          <span className="mt-2 block h-[3px] w-10 bg-black" />
          <h1 className="mt-4 text-[34px] font-extrabold uppercase leading-[0.95]">
            <span className="block">{first}</span>
            <span className="block">{last}</span>
          </h1>
        </div>
        <p className="self-center border-l border-[#E5E7EB] pl-6 text-[13px] leading-relaxed">{cv.summary}</p>
      </div>
      <GridRow title="Expériences">
        {(cv.experiences.length ? cv.experiences : []).map((e) => (
          <div key={e.id} className="mb-3 grid grid-cols-[120px_1fr] gap-3">
            <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
            <div>
              <p className="text-[13px] font-bold">{e.title} · {e.company}</p>
              <p className="text-[12px]">{experienceText(e.bullets)}</p>
            </div>
          </div>
        ))}
      </GridRow>
      <GridRow title="Formation">
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mb-2 grid grid-cols-[120px_1fr] gap-3">
            <p className="text-[12px]">{formatEducationYear(e.year)}</p>
            <p className="text-[13px] font-bold">{e.diploma} · {e.school}</p>
          </div>
        ))}
      </GridRow>
      <GridRow title="Compétences">
        <p className="flex flex-wrap gap-x-8 text-[12.5px]">
          {(cv.skills.length ? cv.skills : []).map((s) => <span key={s.id}>{s.name}</span>)}
        </p>
      </GridRow>
      <GridRow title="Contact" last>
        <p>{cv.identity.phone}</p>
        <p>{cv.identity.email}</p>
        <p>{cv.identity.location}</p>
      </GridRow>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

function GridRow({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[160px_1fr] gap-6 py-6 ${last ? "" : "border-b border-[#E5E7EB]"}`}>
      <p className="text-[12px] font-extrabold uppercase">{title}</p>
      <div>{children}</div>
    </div>
  );
}
