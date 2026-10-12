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

export function NgoYellow({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv);
  const Y = "#F5C518";
  return (
    <A4Page className={className} pageClassName="relative flex bg-white text-black">
      <aside className="relative z-0 w-[270px] shrink-0 bg-[#111] px-6 pb-10 pt-[150px] text-white">
        <h2 className="text-[12px] font-bold">Compétences</h2>
        <ul className="mt-3 space-y-2.5">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <li key={s.id}>
              <p className="mb-1 text-[11px]">{s.name}</p>
              <Bar value={s.level} track="#333" fill={Y} height={5} />
            </li>
          ))}
        </ul>
        <h2 className="mt-7 text-[12px] font-bold">Langues</h2>
        <ul className="mt-3 space-y-1.5 text-[12px]">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: Y }} />
              {l.name}
            </li>
          ))}
        </ul>
        <h2 className="mt-7 text-[12px] font-bold">Soft skills</h2>
        <ul className="mt-3 space-y-1.5 text-[12px]">
          {["Créativité", "Autonomie", "Esprit d'équipe", "Résolution de problèmes"].map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-black" style={{ background: Y }}>✓</span>
              {s}
            </li>
          ))}
        </ul>
      </aside>
      <div className="relative z-10 min-w-0 flex-1 px-8 pb-8 pt-8">
        <div className="absolute -left-[70px] top-7 z-20 h-[118px] w-[118px] overflow-hidden rounded-full bg-[#F5C518] ring-4 ring-white">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <div className="pl-[60px]">
          <h1 className="text-[30px] font-extrabold leading-none">{fullName(cv)}</h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.12em]">{cv.identity.title}</p>
        </div>
        <ul className="absolute right-8 top-8 space-y-1.5 text-[11px]">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center justify-end gap-2">
              {c.label}
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full text-black" style={{ background: Y }}>
                <ContactGlyph name={c.key} />
              </span>
            </li>
          ))}
        </ul>
        <h2 className="mt-16 text-[13px] font-bold">À propos</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#333]">{cv.summary}</p>
        <h2 className="mt-6 text-[13px] font-bold">Expériences</h2>
        <div className="relative mt-3 border-l-2 pl-4" style={{ borderColor: Y }}>
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-4">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: Y }} />
              <p className="text-[12px] font-semibold" style={{ color: "#C9A000" }}>{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold">{e.title}</p>
              <p className="text-[12px] text-[#666]">{e.company}</p>
              <p className="text-[12px] text-[#444]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <h2 className="text-[13px] font-bold">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-3 flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black" style={{ background: Y }}>▲</span>
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "#C9A000" }}>{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px] text-[#666]">{e.school}</p>
            </div>
          </div>
        ))}
        <div className="relative mt-8 rounded-xl border-2 px-6 py-5 text-center" style={{ borderColor: Y }}>
          <p className="text-[13px] font-bold italic">« Codez vos rêves, et laissez la technologie faire le reste. »</p>
        </div>
        <ExtraFilledSections cv={cv} includeInterests />
      </div>
    </A4Page>
  );
}

export function NathanMbarga({ cv, className }: { cv: CvData; className?: string }) {
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-[#F4F6F8] text-[#1B2A4A]">
      <aside className="w-[250px] shrink-0 bg-[#152238] px-6 pb-8 pt-[200px] text-white">
        <h2 className="text-[12px] font-bold">Contact</h2>
        <ul className="mt-3 space-y-2 text-[11px]">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-white text-[#152238]">
                <ContactGlyph name={c.key} />
              </span>
              <span className="break-all">{c.label}</span>
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[12px] font-bold">Compétences</h2>
        <ul className="mt-3 space-y-1.5 text-[12px]">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F0B429]" /> {s.name}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[12px] font-bold">Langues</h2>
        <ul className="mt-3 space-y-2">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id}>
              <p className="mb-1 text-[12px]">{l.name}</p>
              <Bar value={languageWidth(l.level)} track="#2A4060" fill="#4A90E2" />
            </li>
          ))}
        </ul>
      </aside>
      <div className="relative min-w-0 flex-1 px-8 py-8">
        <div
          className="absolute left-[-40px] top-0 h-[180px] w-[180px] overflow-hidden bg-[#152238]"
          style={{ borderBottomRightRadius: "55%" }}
        >
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <div className="pl-[150px]">
          <h1 className="font-serif text-[34px] font-semibold leading-none">{fullName(cv)}</h1>
          <p className="mt-2 text-[13px] text-[#555]">{cv.identity.title}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-[#666]">{cv.summary}</p>
        </div>
        <h2 className="mt-10 text-[13px] font-bold">Expériences</h2>
        <span className="mb-3 mt-1 block h-px bg-[#D5D8DE]" />
        <div className="relative border-l border-[#D5D8DE] pl-4">
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-4">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#152238]" />
              <p className="text-[11px] text-[#3A7BD5]">{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold">{e.title}</p>
              <p className="text-[12px] text-[#777]">{e.company}</p>
              <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <h2 className="text-[13px] font-bold">Formation</h2>
        <span className="mb-3 mt-1 block h-px bg-[#D5D8DE]" />
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mb-2 pl-4">
            <p className="text-[11px] text-[#3A7BD5]">{formatEducationYear(e.year)}</p>
            <p className="text-[13px] font-bold">{e.diploma}</p>
            <p className="text-[12px] text-[#777]">{e.school}</p>
          </div>
        ))}
        <h2 className="mt-4 text-[13px] font-bold">Centres d&apos;intérêt</h2>
        <div className="mt-3 flex gap-5">
          {(cv.interests ?? []).slice(0, 4).map((i) => (
            <div key={i.id} className="flex flex-col items-center gap-1 text-[10px]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#152238] text-white">
                <InterestIcon name={i.name} icon={i.icon} />
              </span>
              {i.name}
            </div>
          ))}
        </div>
        <ExtraFilledSections cv={cv} />
      </div>
    </A4Page>
  );
}

export function PhotoHaut({ cv, className }: { cv: CvData; className?: string }) {
  return (
    <A4Page className={className} pageClassName="bg-white px-[64px] py-[48px] text-black">
      <header className="flex flex-col items-center text-center">
        <div className="h-[104px] w-[104px] overflow-hidden rounded-full bg-[#E5E7EB]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <h1 className="mt-4 text-[28px] font-extrabold">{fullName(cv)}</h1>
        <p className="mt-1 text-[12px] uppercase tracking-[0.16em]">{cv.identity.title}</p>
        <p className="mt-2 text-[12px] text-[#444]">
          {cv.identity.email} | {cv.identity.phone} | {cv.identity.location}
        </p>
      </header>
      <hr className="my-6 border-[#D1D5DB]" />
      <h2 className="text-[12px] font-extrabold uppercase">Profil</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
      <h2 className="mt-6 text-[12px] font-extrabold uppercase">Expériences</h2>
      {(cv.experiences.length ? cv.experiences : []).map((e) => (
        <div key={e.id} className="mt-3">
          <div className="flex justify-between">
            <p><span className="font-bold">{e.title}</span> | {e.company}</p>
            <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
          </div>
          <p className="mt-1 text-[12px] text-[#333]">{experienceText(e.bullets)}</p>
        </div>
      ))}
      <h2 className="mt-6 text-[12px] font-extrabold uppercase">Formation</h2>
      {(cv.education.length ? cv.education : []).map((e) => (
        <div key={e.id} className="mt-2 flex justify-between">
          <p><span className="font-bold">{e.diploma}</span> | {e.school}</p>
          <p className="text-[12px]">{formatEducationYear(e.year)}</p>
        </div>
      ))}
      <h2 className="mt-6 text-[12px] font-extrabold uppercase">Compétences</h2>
      <p className="mt-2 text-[12.5px]">{(cv.skills.length ? cv.skills : []).map((s) => s.name).join(", ")}</p>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

export function ElongouTypo({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[58px] py-[52px] text-black">
      <h1 className="text-[40px] font-extrabold uppercase leading-[0.95]">
        <span className="block">{first}</span>
        <span className="block">{last}</span>
      </h1>
      <p className="mt-3 text-[12px] uppercase tracking-[0.14em]">{cv.identity.title}</p>
      <span className="mt-3 block h-px w-12 bg-black" />
      <h2 className="mt-10 text-[12px] font-extrabold uppercase">Profil</h2>
      <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed">{cv.summary}</p>
      <h2 className="mt-8 text-[12px] font-extrabold uppercase">Expériences</h2>
      {(cv.experiences.length ? cv.experiences : []).map((e) => (
        <div key={e.id} className="mt-3 grid grid-cols-[130px_1fr] gap-4">
          <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
          <div>
            <p className="text-[13px] font-bold">{e.title} · {e.company}</p>
            <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
          </div>
        </div>
      ))}
      <hr className="my-8 border-black" />
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-[12px] font-extrabold uppercase">Formation</h2>
          {(cv.education.length ? cv.education : []).map((e) => (
            <div key={e.id} className="mt-3">
              <p className="text-[12px]">{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px]">{e.school}</p>
            </div>
          ))}
        </div>
        <div className="border-l border-black pl-8">
          <h2 className="text-[12px] font-extrabold uppercase">Contact</h2>
          <p className="mt-3 text-[12px]">{cv.identity.phone}</p>
          <p className="text-[12px]">{cv.identity.email}</p>
          <p className="text-[12px]">{cv.identity.location}</p>
        </div>
      </div>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}
