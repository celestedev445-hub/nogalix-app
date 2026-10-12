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

export function KouamePhoto({ cv, className }: { cv: CvData; className?: string }) {
  const { first, last } = displayName(cv);
  return (
    <A4Page className={className} pageClassName="bg-white px-[56px] py-[48px] text-black">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-extrabold uppercase tracking-[0.04em]">{first} {last}</h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.18em]">{cv.identity.title}</p>
          <span className="mt-3 block h-px w-24 bg-black" />
        </div>
        <div className="h-[110px] w-[110px] overflow-hidden bg-[#DDD]">
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
      </header>
      <hr className="my-5 border-[#E0E0E0]" />
      <h2 className="text-[12px] font-extrabold uppercase">Profil</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed">{cv.summary}</p>
      <hr className="my-5 border-[#E0E0E0]" />
      <h2 className="text-[12px] font-extrabold uppercase">Expériences</h2>
      {(cv.experiences.length ? cv.experiences : []).map((e) => (
        <div key={e.id} className="mt-3 grid grid-cols-[120px_1fr] gap-4">
          <p className="text-[12px]">{formatCvYearRange(e.start, e.end, e.current)}</p>
          <div>
            <p className="text-[13px] font-bold">{e.title} · {e.company}</p>
            <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
          </div>
        </div>
      ))}
      <hr className="my-5 border-[#E0E0E0]" />
      <h2 className="text-[12px] font-extrabold uppercase">Formation</h2>
      {(cv.education.length ? cv.education : []).map((e) => (
        <div key={e.id} className="mt-3 grid grid-cols-[120px_1fr] gap-4">
          <p className="text-[12px]">{formatEducationYear(e.year)}</p>
          <p className="text-[13px] font-bold">{e.diploma} · {e.school}</p>
        </div>
      ))}
      <hr className="my-5 border-[#E0E0E0]" />
      <h2 className="text-[12px] font-extrabold uppercase">Compétences</h2>
      <p className="mt-3 flex justify-between text-[12.5px]">
        {(cv.skills.length ? cv.skills : []).slice(0, 6).map((s) => <span key={s.id}>{s.name}</span>)}
      </p>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

export function AminaPastel({ cv, className }: { cv: CvData; className?: string }) {
  const GREEN = "#4F6B4A";
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="bg-[#FDFBF7] px-9 py-8 text-[#1C241C]">
      <header className="flex gap-6">
        <div
          className="h-[140px] w-[140px] overflow-hidden bg-[#D7DFC8]"
          style={{ borderRadius: "70% 30% 70% 30%" }}
        >
          <Photo src={cv.identity.photo} name={initialsOf(cv)} />
        </div>
        <div className="pt-4">
          <h1 className="font-serif text-[34px] font-semibold leading-none">{fullName(cv)}</h1>
          <p className="mt-2 text-[14px]">{cv.identity.title}</p>
          <p className="mt-3 text-[12px] italic text-[#555]">« {cv.summary} ♡ »</p>
        </div>
      </header>
      <div className="mt-8 grid grid-cols-[0.9fr_1.2fr] gap-8">
        <div>
          <h2 className="text-[12px] font-bold">Contact</h2>
          <ul className="mt-3 space-y-2 text-[11.5px]">
            {contacts.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <ContactGlyph name={c.key} />
                <span className="break-all">{c.label}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-[12px] font-bold">Langues</h2>
          <ul className="mt-3 space-y-2">
            {(cv.languages.length ? cv.languages : []).map((l) => (
              <li key={l.id}>
                <p className="mb-1 text-[12px]">{l.name}</p>
                <Bar value={languageWidth(l.level)} track="#E4E8DC" fill={GREEN} />
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-[12px] font-bold">Centres d&apos;intérêt</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
            {(cv.interests ?? []).slice(0, 4).map((i) => (
              <span key={i.id} className="flex items-center gap-2">
                <InterestIcon name={i.name} icon={i.icon} /> {i.name}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[12px] font-bold">Compétences</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(cv.skills.length ? cv.skills : []).map((s) => (
              <span key={s.id} className="rounded-full px-3 py-1 text-[11px] text-white" style={{ background: GREEN }}>
                {s.name}
              </span>
            ))}
          </div>
          <h2 className="mt-6 text-[12px] font-bold">Expériences</h2>
          <div className="relative mt-3 border-l pl-4" style={{ borderColor: GREEN }}>
            {(cv.experiences.length ? cv.experiences : []).map((e) => (
              <div key={e.id} className="relative mb-4">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full" style={{ background: GREEN }} />
                <p className="text-[11px] text-[#666]">{formatCvYearRange(e.start, e.end, e.current)}</p>
                <p className="text-[13px] font-bold">{e.title}</p>
                <p className="text-[12px]">{e.company}</p>
                <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
              </div>
            ))}
          </div>
          <h2 className="text-[12px] font-bold">Formation</h2>
          {(cv.education.length ? cv.education : []).map((e) => (
            <div key={e.id} className="mt-2 pl-4">
              <p className="text-[11px] text-[#666]">{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px]">{e.school}</p>
            </div>
          ))}
        </div>
      </div>
      <ExtraFilledSections cv={cv} />
    </A4Page>
  );
}

export function ClassiqueSimple({ cv, className }: { cv: CvData; className?: string }) {
  return (
    <A4Page className={className} pageClassName="bg-white px-[52px] py-[46px] text-black">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold">{fullName(cv)}</h1>
          <p className="mt-1 text-[12px] uppercase tracking-[0.12em]">{cv.identity.title}</p>
        </div>
        <div className="text-right text-[12px] leading-relaxed">
          <p>{cv.identity.phone}</p>
          <p>{cv.identity.email}</p>
          <p>{cv.identity.location}</p>
        </div>
      </header>
      <hr className="my-5 border-black" />
      <div className="grid grid-cols-[160px_1fr] gap-x-6">
        <p className="text-[12px] font-extrabold uppercase">Profil</p>
        <p className="border-l border-[#D1D5DB] pb-6 pl-6 text-[12.5px] leading-relaxed">{cv.summary}</p>
        <p className="text-[12px] font-extrabold uppercase">Expériences</p>
        <div className="border-l border-[#D1D5DB] pb-6 pl-6">
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="mb-4">
              <div className="flex justify-between gap-3">
                <p><span className="font-bold">{e.title}</span> | {e.company}</p>
                <p className="text-[12px] text-[#555]">{formatCvYearRange(e.start, e.end, e.current)}</p>
              </div>
              <p className="mt-1 text-[12px]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] font-extrabold uppercase">Formation</p>
        <div className="border-l border-[#D1D5DB] pb-6 pl-6">
          {(cv.education.length ? cv.education : []).map((e) => (
            <div key={e.id} className="mb-2">
              <p><span className="font-bold">{e.diploma}</span> | {e.school}</p>
              <p className="text-[12px] text-[#555]">{formatEducationYear(e.year)}</p>
            </div>
          ))}
        </div>
        <p className="text-[12px] font-extrabold uppercase">Compétences</p>
        <p className="border-l border-[#D1D5DB] pb-6 pl-6 text-[12.5px]">
          {(cv.skills.length ? cv.skills : []).map((s) => s.name).join(", ")}
        </p>
        <p className="text-[12px] font-extrabold uppercase">Langues</p>
        <p className="border-l border-[#D1D5DB] pl-6 text-[12.5px]">
          {(cv.languages.length ? cv.languages : []).map((l) => `${l.name} : ${l.level}`).join(" | ")}
        </p>
      </div>
      <ExtraFilledSections cv={cv} includeInterests />
    </A4Page>
  );
}

export function DarianMvondo({ cv, className }: { cv: CvData; className?: string }) {
  const ORANGE = "#F29F05";
  const contacts = cvContacts(cv);
  return (
    <A4Page className={className} pageClassName="flex bg-white text-[#1A2B48]">
      <aside className="w-[270px] shrink-0 px-6 pb-8 pt-0">
        <div className="relative h-[210px] w-full overflow-hidden bg-[#1F4D32]" style={{ borderRadius: "0 0 55% 40%" }}>
          <span className="absolute left-3 top-3 h-8 w-8 rounded-full" style={{ background: ORANGE }} />
          <Photo src={cv.identity.photo} name={initialsOf(cv)} className="object-[50%_20%]" />
        </div>
        <h2 className="mt-6 text-[13px] font-bold">Compétences</h2>
        <ul className="mt-3 space-y-2">
          {(cv.skills.length ? cv.skills : []).map((s) => (
            <li key={s.id}>
              <p className="mb-1 text-[11.5px]">{s.name}</p>
              <Bar value={s.level} track="#EEE" fill={`linear-gradient(90deg, ${ORANGE}, #F7D774)`} />
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[13px] font-bold">Langues</h2>
        <ul className="mt-3 space-y-2">
          {(cv.languages.length ? cv.languages : []).map((l) => (
            <li key={l.id}>
              <p className="mb-1 text-[11.5px]">{l.name}</p>
              <Bar value={languageWidth(l.level)} track="#EEE" fill={ORANGE} />
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 px-8 py-8">
        <h1 className="font-script text-[48px] leading-none">{fullName(cv)}</h1>
        <p className="mt-1 text-[13px] font-extrabold uppercase tracking-[0.08em]" style={{ color: ORANGE }}>
          {cv.identity.title}
        </p>
        <ul className="mt-4 space-y-1.5 text-[11.5px]">
          {contacts.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1A2B48] text-white">
                <ContactGlyph name={c.key} />
              </span>
              {c.label}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[13px] font-bold">À propos</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-[#555]">{cv.summary}</p>
        <h2 className="mt-5 text-[13px] font-bold">Expériences</h2>
        <div className="relative mt-2 border-l border-[#DDD] pl-4">
          {(cv.experiences.length ? cv.experiences : []).map((e) => (
            <div key={e.id} className="relative mb-3">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#1A2B48]" />
              <p className="text-[11px]" style={{ color: ORANGE }}>{formatCvYearRange(e.start, e.end, e.current)}</p>
              <p className="text-[13px] font-bold">{e.title}</p>
              <p className="text-[12px] text-[#666]">{e.company}</p>
              <p className="text-[11.5px] text-[#555]">{experienceText(e.bullets)}</p>
            </div>
          ))}
        </div>
        <h2 className="text-[13px] font-bold">Formation</h2>
        {(cv.education.length ? cv.education : []).map((e) => (
          <div key={e.id} className="mt-2 flex gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] text-white" style={{ background: ORANGE }}>▲</span>
            <div>
              <p className="text-[11px]" style={{ color: ORANGE }}>{formatEducationYear(e.year)}</p>
              <p className="text-[13px] font-bold">{e.diploma}</p>
              <p className="text-[12px] text-[#666]">{e.school}</p>
            </div>
          </div>
        ))}
        <h2 className="mt-4 text-[13px] font-bold">Centres d&apos;intérêt</h2>
        <div className="mt-3 flex gap-5">
          {(cv.interests ?? []).slice(0, 4).map((i) => (
            <div key={i.id} className="flex flex-col items-center gap-1 text-[10px]">
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
