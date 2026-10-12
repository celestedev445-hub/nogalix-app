export type CvSectionId =
  | "identite"
  | "accroche"
  | "experience"
  | "formation"
  | "competences"
  | "langues"
  | "projets"
  | "certifications"
  | "interets"
  | "references";

export type ExperienceItem = {
  id: string;
  title: string;
  company: string;
  location?: string;
  start: string;
  end: string;
  current?: boolean;
  bullets: string[];
};

export type EducationItem = {
  id: string;
  diploma: string;
  school: string;
  year: string;
  details?: string;
};

export type SkillItem = {
  id: string;
  name: string;
  level: number;
  icon?: string | null;
};

export type LanguageItem = {
  id: string;
  name: string;
  level: string;
};

export type ProjectItem = {
  id: string;
  name: string;
  description: string;
  url?: string;
};

export type CertificationItem = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

export type InterestItem = {
  id: string;
  name: string;
  icon?: string | null;
};

export type ReferenceItem = {
  id: string;
  name: string;
  role: string;
  company: string;
  phone?: string;
  email?: string;
};

export type CvIdentity = {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  photo?: string | null;
  website?: string;
  github?: string;
};

export type CvEditorStatus = "draft" | "ready";

export type CvImportSource = {
  fileName: string;
  mimeType: string;
  dataUrl?: string;
};

export type CvData = {
  id: string;
  templateId: string;
  title: string;
  principal?: boolean;
  editorStatus?: CvEditorStatus;
  updatedAt: string;
  completion: number;
  identity: CvIdentity;
  summary: string;
  experiences: ExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  interests?: InterestItem[];
  references?: ReferenceItem[];
  importSource?: CvImportSource;
};

export type TemplateCategory =
  | "tous"
  | "moderne"
  | "minimaliste"
  | "creatif"
  | "classique"
  | "premium";

export type CvTemplate = {
  id: string;
  name: string;
  category: Exclude<TemplateCategory, "tous">;
  premium?: boolean;
  description: string;
};
