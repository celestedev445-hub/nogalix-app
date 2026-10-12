import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { SupportTicket } from "@/store/supportStore";
import { useSupportStore } from "@/store/supportStore";

type Props = {
  ticket: SupportTicket;
  canReply?: boolean;
  isAdmin?: boolean;
};

export function SupportTicketThread({ ticket, canReply = false, isAdmin = false }: Props) {
  const replyToTicket = useSupportStore((s) => s.replyToTicket);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleReply() {
    const text = replyText.trim();
    if (text.length < 2) return;
    setSending(true);
    try {
      await replyToTicket(ticket.id, text);
      setReplyText("");
      toast({
        title: "Réponse envoyée",
        description: isAdmin
          ? "Le membre sera notifié."
          : "Votre message a été ajouté au ticket.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-medium">Message initial</h4>
        <p className="whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
          {ticket.message}
        </p>
      </div>

      {(ticket.replies?.length ?? 0) > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Conversation</h4>
          {ticket.replies!.map((reply) => (
            <div
              key={reply.id}
              className={
                reply.is_staff
                  ? "ml-0 mr-4 rounded-lg border border-principale/20 bg-principale/10 p-3 text-sm"
                  : "ml-4 mr-0 rounded-lg border border-muted bg-muted/40 p-3 text-sm"
              }
            >
              <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {reply.author?.name ?? (reply.is_staff ? "Support" : "Membre")}
                  {reply.is_staff ? " · Équipe" : ""}
                </span>
                {reply.created_at ? (
                  <span>{format(new Date(reply.created_at), "PPp", { locale: fr })}</span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{reply.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      {canReply ? (
        <div className="space-y-2 border-t pt-2">
          <Textarea
            placeholder={
              isAdmin ? "Votre réponse au membre..." : "Ajouter un complément à votre demande..."
            }
            className="min-h-[100px] bg-background/50"
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-principale hover:bg-principale/90"
            disabled={sending || replyText.trim().length < 2}
            onClick={() => void handleReply()}
          >
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Répondre"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
