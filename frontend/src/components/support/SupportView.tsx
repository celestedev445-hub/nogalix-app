import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/lib/appConfig";
import { canAccessAdmin } from "@/lib/security";
import { SupportAdminTickets } from "@/components/support/SupportAdminTickets";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { SupportStatusBadge, supportSubjectLabel } from "@/components/support/supportTicketUi";
import { useAuthStore } from "@/store/authStore";
import { useSupportStore } from "@/store/supportStore";

const formSchema = z.object({
  nom: z.string().min(1, { message: "Le nom est obligatoire" }),
  email: z.string().email({ message: "Veuillez entrer un email valide" }),
  sujet: z.string().min(1, { message: "Veuillez sélectionner un sujet" }),
  message: z.string().min(10, { message: "Le message doit contenir au moins 10 caractères" }),
});

export function SupportView() {
  const user = useAuthStore((s) => s.user);
  const tickets = useSupportStore((s) => s.tickets);
  const loading = useSupportStore((s) => s.loading);
  const error = useSupportStore((s) => s.error);
  const createTicket = useSupportStore((s) => s.createTicket);
  const loadTickets = useSupportStore((s) => s.loadTickets);
  const deleteTicket = useSupportStore((s) => s.deleteTicket);
  const isAdmin = canAccessAdmin(user, appConfig.adminEmails);
  const contactEmail = appConfig.supportEmail || appConfig.contactEmail;
  const contactPhone = appConfig.contactPhone;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: user?.name || "",
      email: user?.email || "",
      sujet: "",
      message: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        nom: user.name || "",
        email: user.email || "",
        sujet: "",
        message: "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (!isAdmin) {
      loadTickets().catch(() => {
        /* ignore */
      });
    }
  }, [loadTickets, isAdmin]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      await createTicket({
        nom: data.nom,
        email: data.email,
        sujet: data.sujet,
        message: data.message,
      });
      toast({
        title: "Ticket créé",
        description:
          "Votre ticket a été créé avec succès. Nous vous répondrons par mail dans les plus brefs délais",
        variant: "success",
      });
      form.reset({
        nom: user?.name || "",
        email: user?.email || "",
        sujet: "",
        message: "",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du ticket",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-principale/10 to-secondaire/10 p-6">
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-principale">
              <span className="rounded-md bg-principale/10 p-1.5">
                <HelpCircle className="h-6 w-6" />
              </span>
              Support
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? "Gestion de tous les tickets membres" : "Nous sommes là pour vous aider"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-md bg-background/50 p-2 backdrop-blur-sm">
              <Mail className="h-4 w-4 text-principale" />
              <span className="text-sm text-muted-foreground">{contactEmail}</span>
            </div>
            {contactPhone ? (
              <div className="flex items-center gap-2 rounded-md bg-background/50 p-2 backdrop-blur-sm">
                <Phone className="h-4 w-4 text-principale" />
                <span className="text-sm text-muted-foreground">{contactPhone}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isAdmin ? (
        <SupportAdminTickets />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-none bg-card/50 shadow-md backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/50 py-4">
              <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
                <MessageSquare className="h-4 w-4 text-principale" />
                Contactez le support
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Votre nom" className="bg-background/50" disabled {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            className="bg-background/50"
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sujet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder="Sélectionnez un sujet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bug">Signalement de bug</SelectItem>
                            <SelectItem value="feature">Nouvelle fonctionnalité</SelectItem>
                            <SelectItem value="question">Question générale</SelectItem>
                            <SelectItem value="other">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrivez votre problème..."
                            className="min-h-[150px] bg-background/50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="flex w-full items-center gap-2 bg-principale hover:bg-principale/90"
                    disabled={loading}
                  >
                    <Send className="h-4 w-4" />
                    {loading ? "Envoi en cours..." : "Envoyer"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none bg-card/50 shadow-md backdrop-blur-sm">
              <CardHeader className="border-b bg-muted/50 py-4">
                <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
                  <Clock className="h-4 w-4 text-principale" />
                  Horaires d&apos;ouverture
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <span className="text-sm text-muted-foreground">Lundi - Vendredi</span>
                    <span className="text-sm font-medium text-principale">9h00 - 18h00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <span className="text-sm text-muted-foreground">Samedi</span>
                    <span className="text-sm font-medium text-principale">10h00 - 16h00</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <span className="text-sm text-muted-foreground">Dimanche</span>
                    <span className="text-sm font-medium text-muted-foreground">Fermé</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-card/50 shadow-md backdrop-blur-sm">
              <CardHeader className="border-b bg-muted/50 py-4">
                <CardTitle className="flex items-center gap-1.5 text-base font-semibold">
                  <MessageSquare className="h-4 w-4 text-principale" />
                  Tickets récents
                </CardTitle>
              </CardHeader>
              {error ? (
                <div className="border-b border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              ) : null}
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-principale" />
                  </div>
                ) : tickets.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucun ticket récent</p>
                ) : (
                  <div className="space-y-4">
                    {tickets.slice(0, 3).map((ticket) => (
                      <details key={ticket.id} className="rounded-lg border border-border/60">
                        <summary className="cursor-pointer list-none px-3 py-3 [&::-webkit-details-marker]:hidden">
                          <div className="flex w-full flex-col items-start gap-1.5 pr-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="min-w-0 font-medium text-principale max-md:text-sm">
                              {supportSubjectLabel(ticket.sujet)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-muted-foreground">{ticket.code}</span>
                              <SupportStatusBadge status={ticket.status} />
                            </div>
                          </div>
                        </summary>
                        <div className="space-y-3 px-3 pb-3 pt-2">
                          {ticket.created_at ? (
                            <p className="text-xs text-muted-foreground">
                              Ouvert le {format(new Date(ticket.created_at), "PPP", { locale: fr })}
                            </p>
                          ) : null}
                          <SupportTicketThread ticket={ticket} canReply />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => void deleteTicket(ticket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
