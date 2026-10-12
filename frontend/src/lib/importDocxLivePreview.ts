import type { CvData } from "@/lib/cvTypes";
import { fullName } from "@/components/templates/shared";
import { formatCvPeriod } from "@/lib/formatDate";

type Replacement = { from: string; to: string };

function pushPair(pairs: Replacement[], from: string | undefined, to: string | undefined) {
  const source = (from || "").trim();
  const target = (to || "").trim();
  if (!source || source === target || source.length < 2) return;
  pairs.push({ from: source, to: target });
}

export function buildCvReplacementPairs(before: CvData, after: CvData): Replacement[] {
  const pairs: Replacement[] = [];

  pushPair(pairs, fullName(before), fullName(after));
  pushPair(pairs, before.identity.firstName, after.identity.firstName);
  pushPair(pairs, before.identity.lastName, after.identity.lastName);
  pushPair(pairs, before.identity.title, after.identity.title);
  pushPair(pairs, before.identity.email, after.identity.email);
  pushPair(pairs, before.identity.phone, after.identity.phone);
  pushPair(pairs, before.identity.location, after.identity.location);
  pushPair(pairs, before.identity.website, after.identity.website);
  pushPair(pairs, before.identity.github, after.identity.github);
  pushPair(pairs, before.summary, after.summary);

  for (const exp of before.experiences) {
    const next = after.experiences.find((item) => item.id === exp.id);
    if (!next) continue;
    pushPair(pairs, exp.title, next.title);
    pushPair(pairs, exp.company, next.company);
    pushPair(pairs, exp.location, next.location);
    pushPair(
      pairs,
      formatCvPeriod(exp.start, exp.end, exp.current),
      formatCvPeriod(next.start, next.end, next.current),
    );
    for (let i = 0; i < exp.bullets.length; i += 1) {
      pushPair(pairs, exp.bullets[i], next.bullets[i]);
    }
  }

  for (const edu of before.education) {
    const next = after.education.find((item) => item.id === edu.id);
    if (!next) continue;
    pushPair(pairs, edu.diploma, next.diploma);
    pushPair(pairs, edu.school, next.school);
    pushPair(pairs, edu.year, next.year);
    pushPair(pairs, edu.details, next.details);
  }

  for (const skill of before.skills) {
    const next = after.skills.find((item) => item.id === skill.id);
    if (!next) continue;
    pushPair(pairs, skill.name, next.name);
  }

  for (const lang of before.languages) {
    const next = after.languages.find((item) => item.id === lang.id);
    if (!next) continue;
    pushPair(pairs, lang.name, next.name);
    pushPair(pairs, lang.level, next.level);
  }

  const seen = new Set<string>();
  return pairs
    .filter((pair) => {
      const key = pair.from.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.from.length - a.from.length);
}

export function applyReplacementsToHtml(html: string, pairs: Replacement[]) {
  let next = html;
  for (const pair of pairs) {
    next = next.split(pair.from).join(pair.to);
  }
  return next;
}
