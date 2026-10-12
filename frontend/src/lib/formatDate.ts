const MONTHS_FR = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

export function formatMonthYear(value: string) {
  if (!value) return "";
  const [year, month] = value.split("-");
  const index = Number(month);
  if (!year || !index || index < 1 || index > 12) return value;
  return `${MONTHS_FR[index - 1]} ${year}`;
}

export function formatCvPeriod(start: string, end: string, current?: boolean) {
  const from = formatMonthYear(start);
  const to = current || !end ? "Aujourd'hui" : formatMonthYear(end);
  if (!from) return to;
  return `${from} à ${to}`;
}

export function formatCvYearRange(start: string, end: string, current?: boolean) {
  const from = yearOf(start);
  const to = current || !end ? "Présent" : yearOf(end);
  if (!from) return to;
  return `${from} à ${to}`;
}

function yearOf(value: string) {
  if (!value) return "";
  const match = value.match(/(\d{4})/);
  return match?.[1] ?? value;
}
