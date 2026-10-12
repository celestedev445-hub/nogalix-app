import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MessageSquare, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import {
  DIRECTORY_MONTHS,
  SupportStatusBadge,
  supportSubjectLabel,
  ticketMemberLabel,
} from "@/components/support/supportTicketUi";
import { useSupportStore, type SupportTicketFilters } from "@/store/supportStore";

const PAGE_SIZE = 10;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function SupportTicketsPagination({
  pageIndex,
  pageCount,
  total,
  onPageChange,
}: {
  pageIndex: number;
  pageCount: number;
  total: number;
  onPageChange: (index: number) => void;
}) {
  if (pageCount <= 1) {
    return (
      <p className="pt-2 text-center text-sm text-muted-foreground sm:text-left">
        <span className="font-semibold text-principale">{total}</span> ticket
        {total !== 1 ? "s" : ""}
      </p>
    );
  }

  const from = pageIndex * PAGE_SIZE + 1;
  const to = Math.min((pageIndex + 1) * PAGE_SIZE, total);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Affichage{" "}
        <span className="font-semibold text-principale">
          {from}–{to}
        </span>{" "}
        sur <span className="font-semibold text-principale">{total}</span> ticket
        {total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        {Array.from({ length: pageCount }).map((_, idx) => (
          <Button
            key={idx}
            type="button"
            size="sm"
            variant={pageIndex === idx ? "default" : "outline"}
            className={pageIndex === idx ? "h-8 bg-principale hover:bg-principale/90" : "h-8"}
            onClick={() => onPageChange(idx)}
          >
            {idx + 1}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SupportAdminTickets() {
  const tickets = useSupportStore((s) => s.tickets);
  const loading = useSupportStore((s) => s.loading);
  const error = useSupportStore((s) => s.error);
  const loadTickets = useSupportStore((s) => s.loadTickets);
  const deleteTicket = useSupportStore((s) => s.deleteTicket);
  const updateTicketStatus = useSupportStore((s) => s.updateTicketStatus);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSujet, setSelectedSujet] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);

  const useSpecificMonth = selectedYear !== "all" && selectedMonth !== "all";

  const fetchTickets = useCallback(() => {
    const filters: SupportTicketFilters = {
      search: searchTerm,
      status: selectedStatus,
      sujet: selectedSujet,
      period: useSpecificMonth ? "all" : selectedPeriod,
      year: selectedYear,
      month: selectedMonth,
    };
    return loadTickets(filters);
  }, [
    loadTickets,
    searchTerm,
    selectedStatus,
    selectedSujet,
    selectedPeriod,
    selectedYear,
    selectedMonth,
    useSpecificMonth,
  ]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, selectedStatus, selectedSujet, selectedPeriod, selectedYear, selectedMonth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets().catch(() => {
        toast({
          title: "Erreur",
          description: "Impossible de charger les tickets",
          variant: "destructive",
        });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  const pageCount = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageIndex, pageCount]);

  const paginatedTickets = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return tickets.slice(start, start + PAGE_SIZE);
  }, [tickets, pageIndex]);

  async function handleDeleteTicket(id: number) {
    try {
      await deleteTicket(id);
      toast({ title: "Succès", description: "Le ticket a été supprimé", variant: "success" });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le ticket",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateStatus(id: number, newStatus: string) {
    try {
      await updateTicketStatus(id, newStatus);
      toast({
        title: "Succès",
        description: "Le statut du ticket a été mis à jour",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-none bg-card/50 shadow-md backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, email, code, message…)"
                className="bg-background/50 pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en attente">En attente</SelectItem>
                  <SelectItem value="en traitement">En traitement</SelectItem>
                  <SelectItem value="résolu">Résolu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSujet} onValueChange={setSelectedSujet}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Sujet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sujets</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Fonctionnalité</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedPeriod}
                onValueChange={(value) => {
                  setSelectedPeriod(value);
                  if (value !== "all") {
                    setSelectedYear("all");
                    setSelectedMonth("all");
                  }
                }}
                disabled={useSpecificMonth}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute période</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois-ci</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  if (value === "all") setSelectedMonth("all");
                  else setSelectedPeriod("all");
                }}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value);
                  if (value !== "all") setSelectedPeriod("all");
                }}
                disabled={selectedYear === "all"}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {DIRECTORY_MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/50 shadow-md backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
            <MessageSquare className="h-4 w-4 text-principale" />
            Tous les tickets ({tickets.length})
          </CardTitle>
        </CardHeader>
        {error ? (
          <div className="border-b border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <CardContent className="p-6">
          {loading && tickets.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-principale" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun ticket trouvé</p>
          ) : (
            <>
              <div className="grid max-h-[min(60dvh,calc(100dvh-20rem))] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
                {paginatedTickets.map((ticket) => (
                  <details
                    key={ticket.id}
                    className="rounded-lg border border-border/60 bg-card/80 shadow-sm"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-col items-start justify-between gap-2 pr-2 text-left">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-principale">
                              {supportSubjectLabel(ticket.sujet)}
                            </h3>
                            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs">
                              {ticket.code}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {ticketMemberLabel(ticket)} · {ticket.email}
                          </div>
                        </div>
                        <SupportStatusBadge status={ticket.status} />
                      </div>
                    </summary>
                    <div className="space-y-4 px-4 pb-4 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => void handleUpdateStatus(ticket.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en attente">En attente</SelectItem>
                            <SelectItem value="en traitement">En traitement</SelectItem>
                            <SelectItem value="résolu">Résolu</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {ticket.created_at
                              ? format(new Date(ticket.created_at), "PPP", { locale: fr })
                              : null}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                            onClick={() => void handleDeleteTicket(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <SupportTicketThread ticket={ticket} canReply isAdmin />
                    </div>
                  </details>
                ))}
              </div>
              <SupportTicketsPagination
                pageIndex={pageIndex}
                pageCount={pageCount}
                total={tickets.length}
                onPageChange={setPageIndex}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
