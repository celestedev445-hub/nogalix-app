import type {
  CertificationItem,
  CvData,
  CvIdentity,
  EducationItem,
  ExperienceItem,
  InterestItem,
  LanguageItem,
  ProjectItem,
  ReferenceItem,
  SkillItem,
} from "@/lib/cvTypes";

export type CvPatch = {
  title?: string;
  summary?: string;
  identity?: Partial<CvIdentity>;
  experiences?: ExperienceItem[];
  education?: EducationItem[];
  skills?: SkillItem[];
  languages?: LanguageItem[];
  projects?: ProjectItem[];
  certifications?: CertificationItem[];
  interests?: InterestItem[];
  references?: ReferenceItem[];
  /** When true, replace list sections instead of merging by id / appending. */
  replaceLists?: boolean;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureExperienceIds(items: ExperienceItem[]): ExperienceItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("exp"),
    bullets: Array.isArray(item.bullets) ? item.bullets : [],
  }));
}

function ensureEducationIds(items: EducationItem[]): EducationItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("edu"),
  }));
}

function ensureSkillIds(items: SkillItem[]): SkillItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("sk"),
    level: typeof item.level === "number" ? item.level : 70,
  }));
}

function ensureLanguageIds(items: LanguageItem[]): LanguageItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("lg"),
  }));
}

function ensureProjectIds(items: ProjectItem[]): ProjectItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("pr"),
  }));
}

function ensureCertificationIds(items: CertificationItem[]): CertificationItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("cert"),
  }));
}

function ensureInterestIds(items: InterestItem[]): InterestItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("int"),
  }));
}

function ensureReferenceIds(items: ReferenceItem[]): ReferenceItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || newId("ref"),
    role: item.role ?? "",
    company: item.company ?? "",
  }));
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[], replace: boolean): T[] {
  if (replace) return incoming;
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, { ...(map.get(item.id) as T | undefined), ...item });
  }
  const kept = current.map((item) => map.get(item.id)!);
  const extras = incoming.filter((item) => !current.some((c) => c.id === item.id));
  return [...kept, ...extras];
}

/** Apply an assistant CV patch onto the current draft. */
export function applyCvPatch(draft: CvData, patch: CvPatch | null | undefined): CvData {
  if (!patch || typeof patch !== "object") return draft;
  const replace = Boolean(patch.replaceLists);

  const next: CvData = {
    ...draft,
    title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : draft.title,
    summary:
      typeof patch.summary === "string" ? patch.summary : draft.summary,
    identity: patch.identity
      ? { ...draft.identity, ...sanitizeIdentity(patch.identity) }
      : draft.identity,
  };

  if (patch.experiences) {
    next.experiences = mergeById(
      draft.experiences,
      ensureExperienceIds(patch.experiences),
      replace,
    );
  }
  if (patch.education) {
    next.education = mergeById(
      draft.education,
      ensureEducationIds(patch.education),
      replace,
    );
  }
  if (patch.skills) {
    next.skills = mergeById(draft.skills, ensureSkillIds(patch.skills), replace);
  }
  if (patch.languages) {
    next.languages = mergeById(
      draft.languages,
      ensureLanguageIds(patch.languages),
      replace,
    );
  }
  if (patch.projects) {
    next.projects = mergeById(
      draft.projects,
      ensureProjectIds(patch.projects),
      replace,
    );
  }
  if (patch.certifications) {
    next.certifications = mergeById(
      draft.certifications,
      ensureCertificationIds(patch.certifications),
      replace,
    );
  }
  if (patch.interests) {
    next.interests = mergeById(
      draft.interests ?? [],
      ensureInterestIds(patch.interests),
      replace,
    );
  }
  if (patch.references) {
    next.references = mergeById(
      draft.references ?? [],
      ensureReferenceIds(patch.references),
      replace,
    );
  }

  return next;
}

function sanitizeIdentity(partial: Partial<CvIdentity>): Partial<CvIdentity> {
  const out: Partial<CvIdentity> = {};
  const keys: (keyof CvIdentity)[] = [
    "firstName",
    "lastName",
    "title",
    "email",
    "phone",
    "location",
    "photo",
    "website",
    "github",
  ];
  for (const key of keys) {
    if (partial[key] !== undefined) {
      out[key] = partial[key] as never;
    }
  }
  return out;
}

export function patchHasContent(patch: CvPatch | null | undefined): boolean {
  if (!patch) return false;
  return Boolean(
    patch.title ||
      patch.summary ||
      (patch.identity && Object.keys(patch.identity).length) ||
      patch.experiences?.length ||
      patch.education?.length ||
      patch.skills?.length ||
      patch.languages?.length ||
      patch.projects?.length ||
      patch.certifications?.length ||
      patch.interests?.length ||
      patch.references?.length,
  );
}
