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

export function DanielNdjock({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv).slice(0, 3);
  return (
    <A4Page className={className} pageClassName="bg-white px-9 py-8 text-[#0F172A]">
      <header className="flex items-start justify-between gap-6">
        <div className="flex-1 pt-2">
          <h1 className="text-[28px] font-extrabold leading-none">{fullName(cv)}</h1>
          <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.1em]">{cv.identity.title}</p>
          <p className="mt-3 max-w-[420px] text-[12.5px] leading-relaxed text-[#475569]">{cv.summary}</p>
        </div>
        <div className="relative">
          <div className="absolute -right-6 -top-8 h-[160px] w-[140px] rounded-bl-[40px] bg-[#DBEAFE]" />
          <div className="relative h-[132px] w-[118px] overflow-hidden rounded-[28px] bg-white">
            <Photo src={cv.identity.photo} name={initialsOf(cv)} />
          </div>
          <span className="absolute -bottom-1 -left-2 h-5 w-5 rounded-full bg-[#3B82F6]" />
        </div>
      </header>
      <div className="mt-6 flex items-center gap-5 border-y border-[#E2E8F0] py-3 text-[11.5px]">
        {contacts.map((c) => (
          <span key={c.key} className="flex items-center gap-2">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#0F172A] text-white">
              <ContactGlyph name={c.key} />
            </span>
            {c.label}
          </span>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-[0.9fr_1.3fr] gap-8">
        <div>
          <h2 className="text-[13px] font-bold">Compétences</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(cv.skills.length ? cv.skills : []).map((s) => (
              <span key={s.id} className="flex items-center gap-2 text-[12px]">
                <SkillGlyph name={s.name} icon={s.icon} size={16} /> {s.name}
              </span>
            ))}
          </div>
          <h2 className="mt-6 text-[13px] font-bold">Langues</h2>
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <div key={l.id} className="mt-2">
              <p className="mb-1 text-[12px]">{l.name}</p>
              <Bar value={languageWidth(l.level)} track="#E2E8F0" fill="#0F172A" />
            </div>
          ))}
          <h2 className="mt-6 text-[13px] font-bold">Centres d&apos;intérêt</h2>
          <div className="mt-3 flex gap-4 text-[10px]">
            {(cv.interests ?? []).slice(0, 3).map((i) => (
              <div key={i.id} className="flex flex-col items-center gap-1">
                <InterestIcon name={i.name} icon={i.icon} />
                {i.name}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[13px] font-bold">Expériences</h2>
          <div className="relative mt-3 border-l-2 border-[#0F172A] pl-4">
            {(cv.experiences.length ? cv.experiences : []).map((e) => (
              <div key={e.id} className="relative mb-4">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#0F172A]" />
                <p className="text-[11px] text-[#3B82F6]">{formatCvYearRange(e.start, e.end, e.current)}</p>
                <p className="text-[13px] font-bold">{e.title}</p>
                <p className="text-[12px] text-[#64748B]">{e.company}</p>
                <p className="text-[11.5px] text-[#64748B]">{experienceText(e.bullets)}</p>
              </div>
            ))}
          </div>
          <h2 className="text-[13px] font-bold">Formation</h2>
          {(cv.education.length ? cv.education : []).map((e) => (
            <div key={e.id} className="mt-2 pl-4">
              <p className="text-[11px] text-[#3B82F6]">{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px] text-[#64748B]">{e.school}</p>
            </div>
          ))}
        </div>
      </div>
      <ExtraFilledSections cv={cv} />
    </A4Page>
  );
}

export function LateralGauche({ cv, className }: { cv: CvData; className?: string }) {
  return (
    <A4Page className={className} pageClassName="flex bg-white text-black">
      <aside className="flex w-[250px] shrink-0 flex-col bg-[#2C2E30] px-7 py-8 text-white">
        <div className="mx-auto h-[110px] w-[110px] overflow-hidden rounded-full bg-[#888]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <h2 className="mt-8 text-[11px] font-extrabold uppercase">Contact</h2>
        <span className="my-2 block h-px bg-white/40" />
        <p className="text-[12px] leading-relaxed">{cv.identity.phone}</p>
        <p className="text-[12px] leading-relaxed break-all">{cv.identity.email}</p>
        <p className="text-[12px] leading-relaxed">{cv.identity.location}</p>
        <h2 className="mt-7 text-[11px] font-extrabold uppercase">Compétences</h2>
        <span className="my-2 block h-px bg-white/40" />
        <ul className="space-y-1 text-[13px]">
          {(cv.skills.length ? cv.skills : []).map((s) => <li key={s.id}>{s.name}</li>)}
        </ul>
        <h2 className="mt-7 text-[11px] font-extrabold uppercase">Langues</h2>
        <span className="my-2 block h-px bg-white/40" />
        {(cv.languages.length ? cv.languages : []).map((l) => (
          <p key={l.id} className="text-[13px]">{l.name} : {l.level}</p>
        ))}
      </aside>
      <div className="min-w-0 flex-1 px-10 py-10">
        <h1 className="text-[30px] font-extrabold">{fullName(cv)}</h1>
        <p className="mt-1 text-[12px] uppercase tracking-[0.12em]">{cv.identity.title}</p>
        <span className="mt-3 block h-[3px] w-14 bg-black" />
        <h2 className="mt-8 text-[12px] font-extrabold uppercase">Profil</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
        <h2 className="mt-7 text-[12px] font-extrabold uppercase">Expériences</h2>
        {(cv.experiences.length ? cv.experiences : []).map((e) => (
          <div key={e.id} className="mt-3">
            <div className="flex justify-between">
              <p className="font-bold">{e.title} | {e.company}</p>
              <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
            </div>
            <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
          </div>
        ))}
        <h2 className="mt-7 text-[12px] font-extrabold uppercase">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-2">
            <p className="font-bold">{e.diploma} | {e.school}</p>
            <p className="text-[12px]">{formatEducationYear(e.year)}</p>
          </div>
        ))}
        <ExtraFilledSections cv={cv} includeInterests />
      </div>
    </A4Page>
  );
}

export function RayanEssomba({ cv, className }: { cv: CvData; className?: string }) {
  const NAVY = "#0a1d37";
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-white text-[#1A1A1A]">
      <aside className="flex w-[270px] shrink-0 flex-col items-center px-6 py-8 text-center text-white" style={{ background: NAVY }}>
        <div className="h-[118px] w-[118px] overflow-hidden rounded-full ring-[3px] ring-[#3a7bd5]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <p className="mt-4 font-script text-[40px] leading-none">{fullName(cv)}</p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em]">{cv.identity.title}</p>
        <ul className="mt-6 w-full space-y-2 text-left text-[11px]">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[#0a1d37]">
                <ContactGlyph name={c.key} />
              </span>
              <span className="break-all">{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-auto px-2 text-[12px] italic leading-relaxed">« L&apos;innovation distingue un leader d&apos;un suiveur. »</p>
        <div className="mt-5 h-[84px] w-[84px] bg-white p-1">
          <div className="h-full w-full bg-[repeating-conic-gradient(#000_0%_25%,#fff_0%_50%)] bg-[length:8px_8px]" />
        </div>
        <p className="mt-2 text-[10px] text-white/80">Scannez pour voir mon portfolio</p>
      </aside>
      <div className="min-w-0 flex-1 px-8 py-8">
        <Head>Profil</Head>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#4a4a4a]">{cv.summary}</p>
        <Head className="mt-6">Expériences</Head>
        <div className="relative mt-3 border-l-2 pl-4" style={{ borderColor: NAVY }}>
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-4">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: "#3a7bd5" }} />
              <p className="text-[11px] text-[#3a7bd5]">{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold" style={{ color: NAVY }}>{e.title}</p>
              <p className="text-[12px] text-[#666]">{e.company}</p>
              <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <Head>Formation</Head>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-2 flex gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] text-white" style={{ background: NAVY }}>▲</span>
            <div>
              <p className="text-[11px] text-[#3a7bd5]">{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold" style={{ color: NAVY }}>{e.diploma}</p>
              <p className="text-[12px] text-[#666]">{e.school}</p>
            </div>
          </div>
        ))}
        <Head className="mt-5">Compétences</Head>
        <div className="mt-3 flex flex-wrap gap-4">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1 text-[10px]">
              <SkillGlyph name={s.name} icon={s.icon} size={28} />
              {s.name}
            </div>
          ))}
        </div>
        <Head className="mt-5">Centres d&apos;intérêt</Head>
        <div className="mt-3 flex gap-5 text-[10px]">
          {(cv.interests ?? []).slice(0, 4).map((i) => (
            <div key={i.id} className="flex flex-col items-center gap-1" style={{ color: NAVY }}>
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

function Head({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={`flex items-center gap-2 text-[13px] font-bold text-[#0a1d37] ${className ?? ""}`}>
      {children}
      <span className="h-px min-w-0 flex-1 bg-[#E5E7EB]" />
    </h2>
  );
}

export function NgoClean({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[56px] py-[48px] text-black">
      <h1 className="text-[28px] font-extrabold uppercase tracking-[0.04em]">{first} {last}</h1>
      <p className="mt-2 text-[12px] uppercase tracking-[0.14em]">{cv.identity.title}</p>
      <span className="mt-3 block h-px w-14 bg-black" />
      <h2 className="mt-8 text-[12px] font-extrabold uppercase">Profil</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
      <hr className="my-6 border-black" />
      <h2 className="text-[12px] font-extrabold uppercase">Expériences</h2>
      {(cv.experiences.length ? cv.experiences : []).map((e) => (
        <div key={e.id} className="mt-3 grid grid-cols-[130px_1fr] gap-4">
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
        <div key={e.id} className="mt-3 grid grid-cols-[130px_1fr] gap-4">
          <p className="text-[12px]">{formatEducationYear(e.year)}</p>
          <p className="text-[13px]"><span className="font-bold">{e.diploma}</span> · {e.school}</p>
        </div>
      ))}
      <hr className="my-6 border-black" />
      <h2 className="text-[12px] font-extrabold uppercase">Compétences</h2>
      <p className="mt-3 flex justify-between text-[12.5px]">
        {(cv.skills.length ? cv.skills : []).map((s) => <span key={s.id}>{s.name}</span>)}
      </p>
      <hr className="my-6 border-black" />
      <h2 className="text-[12px] font-extrabold uppercase">Contact</h2>
      <div className="mt-3 flex justify-between text-[12px]">
        <span>{cv.identity.phone}</span>
        <span>{cv.identity.email}</span>
        <span>{cv.identity.location}</span>
      </div>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}
