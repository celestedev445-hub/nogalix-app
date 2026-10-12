import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "@/platform/dynamic";
import Link from "@/platform/link";
import { useParams } from "@/platform/navigation";
import {
  Check,
  Download,
  Eye,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CvPaper } from "@/components/templates/CvPaper";
import { ScoreRing } from "@/components/cv/ScoreRing";
import { CvModeSwitch } from "@/components/cv/CvModeSwitch";
import { BrandLoader } from "@/components/brand/BrandLoader";
import { BackButton } from "@/components/ui/BackButton";

const CvDownloadModal = dynamic(
  () => import("@/components/cv/CvDownloadModal").then((m) => m.CvDownloadModal),
  { ssr: false },
);

const CvPreviewModal = dynamic(
  () => import("@/components/cv/CvPreviewModal").then((m) => m.CvPreviewModal),
  { ssr: false },
);
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { toast } from "@/hooks/use-toast";
import { voiceCvCopy } from "@/lib/assistant";
import { appConfig } from "@/lib/appConfig";
import { applyCvPatch, patchHasContent } from "@/lib/cvPatch";
import type { CvData } from "@/lib/cvTypes";
import { templatesCatalog } from "@/lib/templatesCatalog";
import { cn } from "@/lib/utils";
import { completionOf, useCvStore } from "@/store/cvStore";
import { useAuthStore } from "@/store/authStore";
import { canUseCapability } from "@/lib/planCapabilities";
import {
  sendAssistantMessage,
  trimAssistantHistory,
  unwrapAssistantReply,
  type ChatMessage,
} from "@/services/assistant";

const cardShadow = "shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

function snapshotForApi(cv: CvData) {
  return {
    ...cv,
    identity: { ...cv.identity, photo: undefined },
  };
}

export function CvVoiceView() {
  const params = useParams<{ id: string }>();
  const cvId = params.id;
  const user = useAuthStore((s) => s.user);
  const loaded = useCvStore((s) => s.loaded);
  const load = useCvStore((s) => s.load);
  const getById = useCvStore((s) => s.getById);
  const upsert = useCvStore((s) => s.upsert);
  const canVoice = canUseCapability(user, "assistant.voice");

  const storeCv = useMemo(() => getById(cvId), [getById, cvId]);
  const [draft, setDraft] = useState<CvData | null>(null);
  const activeCv = draft ?? storeCv ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<CvData | null>(null);

  const firstName = user?.first_name || user?.name?.split(" ")[0];
  const assistantName = appConfig.assistantFirstName || appConfig.assistantName || "Noga";

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!storeCv) return;
    setDraft((prev) => {
      if (!prev || prev.id !== storeCv.id) {
        draftRef.current = storeCv;
        return storeCv;
      }
      const prevTime = Date.parse(prev.updatedAt || "");
      const storeTime = Date.parse(storeCv.updatedAt || "");
      if (Number.isFinite(storeTime) && storeTime >= prevTime) {
        draftRef.current = storeCv;
        return storeCv;
      }
      return prev;
    });
  }, [storeCv, cvId]);

  useEffect(() => {
    if (messages.length) return;
    setMessages([{ role: "assistant", content: voiceCvCopy.greeting(firstName) }]);
  }, [firstName, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const preview = useMemo(() => {
    if (!activeCv) return null;
    return { ...activeCv, completion: completionOf(activeCv) };
  }, [activeCv]);

  function speak(text: string) {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    window.speechSynthesis.speak(utter);
  }

  async function persist(next: CvData, remote = true) {
    setSaving(true);
    try {
      const saved = await upsert(next, remote);
      setDraft(saved);
      draftRef.current = saved;
      if (remote) {
        toast({ title: "CV enregistré", variant: "success" });
      }
    } catch (error) {
      toast({
        title: "Enregistrement impossible",
        description: error instanceof Error ? error.message : "Vos modifications restent en local.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function send(content: string) {
    const text = content.trim();
    if (!text || pending || !draftRef.current) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setPending(true);
    try {
      const payload = await sendAssistantMessage({
        message: text,
        history: trimAssistantHistory(messages),
        zone: "cv",
        cv: snapshotForApi(draftRef.current),
      });
      const { reply, patch } = unwrapAssistantReply(payload);
      let nextDraft = draftRef.current;
      if (patchHasContent(patch)) {
        nextDraft = applyCvPatch(draftRef.current, patch);
        nextDraft = { ...nextDraft, completion: completionOf(nextDraft) };
        setDraft(nextDraft);
        draftRef.current = nextDraft;
        await upsert(nextDraft, false);
        toast({
          title: "CV mis à jour",
          description: "Les infos dictées ont été ajoutées à l'aperçu.",
          variant: "success",
        });
      }
      setMessages([...history, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const fallback =
        "Je n'ai pas pu traiter votre message. Réessayez ou continuez au clavier.";
      setMessages([...history, { role: "assistant", content: fallback }]);
      speak(fallback);
    } finally {
      setPending(false);
    }
  }

  function toggleMic() {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      toast({ title: voiceCvCopy.unsupported, variant: "destructive" });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) void send(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      toast({ title: voiceCvCopy.micDenied, variant: "destructive" });
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      toast({ title: voiceCvCopy.micDenied, variant: "destructive" });
    }
  }

  async function onTemplateChange(templateId: string) {
    if (!draftRef.current) return;
    const template = templatesCatalog.find((t) => t.id === templateId);
    if (template?.premium && !canUseCapability(useAuthStore.getState().user, "templates.premium")) {
      toast({
        title: "Modèle réservé",
        description: "Passez à Pro pour les modèles premium.",
        variant: "destructive",
      });
      return;
    }
    const next = { ...draftRef.current, templateId };
    setDraft(next);
    draftRef.current = next;
    await upsert(next, false);
    toast({
      title: "Modèle changé",
      description: template?.name,
      variant: "success",
    });
  }

  if (!canVoice) {
    return (
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-start gap-2">
          <BackButton fallbackHref="/cv" className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold title-logo sm:text-3xl">CV à la voix</h1>
            <p className="mt-1 max-w-2xl text-sm text-navy/65">
              L&apos;édition vocale est incluse à partir du plan Pro.
            </p>
          </div>
        </div>
        <section className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
          <p className="font-semibold text-navy">Fonctionnalité Pro</p>
          <p className="mt-1 text-sm text-navy/55">
            Dictez votre parcours à {assistantName} et laissez l&apos;IA remplir votre CV.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild className="h-11 rounded-xl">
              <Link href="/plans">Voir les plans</Link>
            </Button>
            {cvId ? (
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <Link href={`/cv/${cvId}`}>Passer en saisie</Link>
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (cvId && !storeCv && !loaded) {
    return <BrandLoader fullPage size={72} label="Chargement de votre CV" />;
  }

  if (cvId && loaded && !storeCv) {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white p-8 text-center", cardShadow)}>
        <p>Ce CV est introuvable.</p>
        <BackButton fallbackHref="/cv" />
      </div>
    );
  }

  if (!activeCv || !preview) {
    return (
      <div className={cn("rounded-xl bg-white p-8 text-center", cardShadow)}>
        <p>Aucun CV à modifier pour le moment.</p>
        <Button className="mt-4 rounded-xl" asChild>
          <Link href="/cv/nouveau">Créer un CV</Link>
        </Button>
      </div>
    );
  }

  const cv = activeCv;

  return (
    <>
    <div className="grid gap-4 xl:min-h-[calc(100dvh-8.5rem)] xl:grid-cols-[minmax(420px,1.2fr)_minmax(280px,1fr)] print:block">
      <section
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white p-4 md:p-5 print:hidden",
          cardShadow,
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <BackButton fallbackHref={`/cv/${cv.id}`} />
          <h1 className="font-display text-lg font-extrabold text-navy">CV à la voix</h1>
          <CvModeSwitch cvId={cv.id} />
          <Select value={cv.templateId} onValueChange={(id) => void onTemplateChange(id)}>
            <SelectTrigger className="h-8 w-[min(100%,180px)] rounded-xl border-gris bg-[#F8FAFC] shadow-none">
              <SelectValue placeholder="Modèle" />
            </SelectTrigger>
            <SelectContent>
              {templatesCatalog.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-succes">
            <Check className="h-3.5 w-3.5" />
            Synchro
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80"
            asChild
          >
            <Link href={`/cv/${cv.id}`}>
              <Keyboard className="h-4 w-4" />
              Passer en saisie
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-gris bg-[#F8FAFC] shadow-none"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye />
            Aperçu
          </Button>
          <Button size="sm" className="rounded-xl" onClick={() => setDownloadOpen(true)}>
            <Download />
            Télécharger
          </Button>
        </div>

        <p className="mt-2 text-xs text-navy/55">
          Parlez ou écrivez : {assistantName} structure les infos. Basculez en saisie quand vous voulez,
          c&apos;est le même CV.
        </p>

        <ScrollArea className="mt-4 min-h-0 flex-1 rounded-xl border border-gris bg-[#F8FAFC]/h-[min(52vh,28rem)]">
          <div className="space-y-3 p-3 sm:p-4">
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {msg.role === "assistant" ? (
                  <AssistantAvatar size={32} className="mt-0.5 shrink-0" />
                ) : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-principale text-white"
                      : "border border-gris bg-white text-navy",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {pending ? (
              <div className="flex items-center gap-2 text-xs text-navy/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {assistantName} réfléchit…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant={listening ? "default" : "secondary"}
            className={cn(
              "h-11 w-11 shrink-0 rounded-xl",
              listening
                ? "bg-principale shadow-brand"
                : "bg-indigo-clair text-principale shadow-none hover:bg-indigo-clair/80",
            )}
            aria-label={listening ? voiceCvCopy.listening : voiceCvCopy.clickToSpeak}
            onClick={toggleMic}
            disabled={pending}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-11 w-11 shrink-0 rounded-xl"
            aria-label={muted ? "Activer la lecture" : "Couper la lecture"}
            onClick={() => {
              setMuted((v) => !v);
              if (typeof window !== "undefined") window.speechSynthesis?.cancel();
            }}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                listening ? voiceCvCopy.listening : voiceCvCopy.placeholder
              }
              className="h-11 rounded-xl border-gris bg-[#F8FAFC] shadow-none"
              disabled={pending}
            />
            <Button
              type="submit"
              className="h-11 rounded-xl px-4 shadow-brand"
              disabled={pending || !input.trim()}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
            </Button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-10 rounded-xl"
            disabled={saving || pending}
            onClick={() => void persist(cv, true)}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Enregistrer
          </Button>
        </div>
      </section>

      <aside
        className={cn(
          "flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-xl bg-white p-3 print:bg-transparent print:p-0 print:shadow-none",
          cardShadow,
        )}
      >
        <div className="flex items-center justify-between gap-2 print:hidden">
          <p className="text-sm font-semibold text-navy">Aperçu live</p>
          <div className="flex items-center gap-2">
            <ScoreRing value={preview.completion} size={40} stroke={4}>
              <span className="text-[9px] font-bold text-navy">{preview.completion}%</span>
            </ScoreRing>
            <span className="text-[11px] text-navy/55">Complété</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gris bg-[#F8FAFC] p-2 print:border-0 print:bg-transparent print:p-0">
          <CvPaper cv={preview} />
        </div>
      </aside>
    </div>
    {downloadOpen && preview ? (
      <CvDownloadModal open={downloadOpen} onOpenChange={setDownloadOpen} cv={preview} />
    ) : null}
    {previewOpen && preview ? (
      <CvPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} cv={preview} />
    ) : null}
    </>
  );
}
