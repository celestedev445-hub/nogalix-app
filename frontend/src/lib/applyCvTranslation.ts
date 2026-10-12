import { applyCvPatch, type CvPatch } from "@/lib/cvPatch";
import type { CvData, CvIdentity } from "@/lib/cvTypes";

function asList<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

export function hasTranslatableContent(cv: CvData) {
  return Boolean(
    cv.summary.trim() ||
      cv.identity.title.trim() ||
      cv.identity.location.trim() ||
      cv.experiences.length ||
      cv.education.length ||
      cv.skills.length ||
      cv.languages.length ||
      cv.projects.length ||
      cv.certifications.length ||
      (cv.interests?.length ?? 0) ||
      (cv.references?.length ?? 0),
  );
}

export function cvPayloadForTranslation(cv: CvData) {
  return {
    title: cv.title,
    identity: {
      firstName: cv.identity.firstName,
      lastName: cv.identity.lastName,
      title: cv.identity.title,
      email: cv.identity.email,
      phone: cv.identity.phone,
      location: cv.identity.location,
      website: cv.identity.website ?? "",
      github: cv.identity.github ?? "",
    },
    summary: cv.summary,
    experiences: cv.experiences,
    education: cv.education,
    skills: cv.skills.map(({ icon: _icon, ...skill }) => skill),
    languages: cv.languages,
    projects: cv.projects,
    certifications: cv.certifications,
    interests: (cv.interests ?? []).map(({ icon: _icon, ...item }) => item),
    references: cv.references ?? [],
  };
}

export function applyTranslatedPayload(cv: CvData, payload: Record<string, unknown>): CvData {
  const identity =
    payload.identity && typeof payload.identity === "object"
      ? (payload.identity as Partial<CvIdentity>)
      : {};

  const patch: CvPatch = {
    title: typeof payload.title === "string" ? payload.title : undefined,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
    identity: {
      title: identity.title,
      location: identity.location,
    },
    experiences: asList(payload.experiences),
    education: asList(payload.education),
    skills: asList(payload.skills),
    languages: asList(payload.languages),
    projects: asList(payload.projects),
    certifications: asList(payload.certifications),
    interests: asList(payload.interests),
    references: asList(payload.references),
    replaceLists: true,
  };

  const next = applyCvPatch(cv, patch);
  return {
    ...next,
    identity: {
      ...next.identity,
      firstName: cv.identity.firstName,
      lastName: cv.identity.lastName,
      email: cv.identity.email,
      phone: cv.identity.phone,
      photo: cv.identity.photo,
      website: cv.identity.website,
      github: cv.identity.github,
    },
    skills: next.skills.map((skill, index) => ({
      ...skill,
      icon: cv.skills.find((item) => item.id === skill.id)?.icon ?? cv.skills[index]?.icon ?? skill.icon,
    })),
    interests: (next.interests ?? []).map((item, index) => ({
      ...item,
      icon: cv.interests?.find((current) => current.id === item.id)?.icon ?? cv.interests?.[index]?.icon ?? item.icon,
    })),
  };
}
