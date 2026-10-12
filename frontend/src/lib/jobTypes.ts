export type JobContract = "CDI" | "CDD" | "Freelance" | "Stage";

export type JobOffer = {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  contract: JobContract;
  source: string;
  url: string;
  salary?: string;
  postedAt: string;
  tags: string[];
  summary: string;
};
