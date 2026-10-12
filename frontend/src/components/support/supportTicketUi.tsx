import { Badge } from "@/components/ui/badge";
import type { SupportTicket } from "@/store/supportStore";

const STATUS_STYLES: Record<string, string> = {
  résolu: "bg-green-400/20 hover:bg-green-400/30 text-green-600",
  "en traitement": "bg-blue-400/20 hover:bg-blue-400/30 text-blue-600",
  "en attente": "bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-600",
};

export function SupportStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] ?? ""}>
      {status}
    </Badge>
  );
}

export const SUPPORT_SUBJECT_LABELS: Record<string, string> = {
  bug: "Signalement de bug",
  feature: "Nouvelle fonctionnalité",
  question: "Question générale",
  other: "Autre",
};

export function supportSubjectLabel(sujet: string): string {
  return SUPPORT_SUBJECT_LABELS[sujet] ?? sujet;
}

export function ticketMemberLabel(ticket: SupportTicket): string {
  return ticket.user?.name ?? ticket.nom;
}

export const DIRECTORY_MONTHS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];
