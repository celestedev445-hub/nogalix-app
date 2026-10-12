import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "@/platform/navigation";
import { Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { VoiceGraph } from "@/components/assistant/VoiceGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  assistantCopy,
  assistantPeekLine,
  voiceCvCopy,
  type AssistantZone,
} from "@/lib/assistant";
import { appConfig } from "@/lib/appConfig";
import { applyCvPatch, patchHasContent } from "@/lib/cvPatch";
import { snapshotCvForAssistant } from "@/lib/cvAssistant";
import {
  sendAssistantMessage,
  trimAssistantHistory,
  unwrapAssistantReply,
  type ChatMessage,
} from "@/services/assistant";
import { completionOf, useCvStore } from "@/store/cvStore";
import { useAuthStore } from "@/store/authStore";
import { useInterfaceStore } from "@/store/interfaceStore";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { aiTrialsHint, canUseAi, syncPlanCapabilities } from "@/lib/planCapabilities";

const STORAGE_KEY = "nogalix-assistant-history";
const DRAG_CLICK_PX = 8;

type DockOffset = { x: number; y: number };

function dockStorageKey(zone: AssistantZone) {
  return `nogalix-noga-dock:${zone}`;
}

function loadDockOffset(zone: AssistantZone): DockOffset {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem(dockStorageKey(zone));
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Number.isFinite((parsed as DockOffset).x) &&
      Number.isFinite((parsed as DockOffset).y)
    ) {
      return { x: (parsed as DockOffset).x, y: (parsed as DockOffset).y };
    }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 };
}

function persistDockOffset(zone: AssistantZone, offset: DockOffset) {
  try {
    localStorage.setItem(dockStorageKey(zone), JSON.stringify(offset));
  } catch {
    /* navigation privée / quota */
  }
}

/** Garde le panneau dans l’écran tout en suivant le décalage du bouton (ancre bas-droite, desktop). */
function clampAssistantPanelOffset(offset: DockOffset): DockOffset {
  if (typeof window === "undefined") return offset;
  const rem = 16;
  const margin = 12;
  const right = 1.25 * rem;
  const bottom = 1.25 * rem;
  const panelW = 22 * rem;
  const panelH = Math.min(34 * rem, window.innerHeight - 5.5 * rem);
  const defaultLeft = window.innerWidth - right - panelW;
  const defaultTop = window.innerHeight - bottom - panelH;
  const left = Math.min(
    Math.max(margin, defaultLeft + offset.x),
    Math.max(margin, window.innerWidth - panelW - margin),
  );
  const top = Math.min(
    Math.max(margin, defaultTop + offset.y),
    Math.max(margin, window.innerHeight - panelH - margin),
  );
  return { x: left - defaultLeft, y: top - defaultTop };
}

const panelSpring = { type: "spring" as const, duration: 0.45, bounce: 0 };
const exitEase = [0.22, 1, 0.36, 1] as const;
const floatEase = [0.45, 0.05, 0.55, 0.95] as const;

function localReply(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("modèle") || lower.includes("template")) return assistantCopy.templates;
  if (lower.includes("section") || lower.includes("expérience")) return assistantCopy.sections;
  if (lower.includes("export") || lower.includes("pdf")) return assistantCopy.export;
  if (lower.includes("emploi") || lower.includes("offre") || lower.includes("job")) {
    return "Dans Emploi, l'IA classe les offres selon votre CV. Choisissez le CV à comparer, puis parcourez d'abord celles qui collent le mieux à votre profil.";
  }
  if (lower.includes("voix") || lower.includes("saisie") || lower.includes("parler")) {
    return assistantCopy.saisieVsVoix;
  }
  return `Je peux vous aider à choisir un modèle, rédiger vos expériences, optimiser pour les ATS ou préparer l'export. ${assistantCopy.saisieVsVoix}`;
}

export function AssistantDock() {
  const open = useInterfaceStore((s) => s.assistantOpen);
  const setOpen = useInterfaceStore((s) => s.setAssistantOpen);
  const setCvVoiceCvId = useInterfaceStore((s) => s.setCvVoiceCvId);
  const muted = useInterfaceStore((s) => s.assistantMuted);
  const setMuted = useInterfaceStore((s) => s.setAssistantMuted);
  const cvVoiceCvId = useInterfaceStore((s) => s.cvVoiceCvId);
  const assistantListenTick = useInterfaceStore((s) => s.assistantListenTick);
  const authenticated = useAuthStore((s) => s.authenticated);
  const user = useAuthStore((s) => s.user);
  const upsertCv = useCvStore((s) => s.upsert);
  const reduceMotion = useReducedMotion();
  const firstName = user?.first_name || user?.name?.split(" ")[0];
  const pathname = usePathname() || "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const editorCvId = pathname.match(/^\/cv\/([^/]+)\/?$/)?.[1] ?? null;
  const activeCvId = cvVoiceCvId && cvVoiceCvId === editorCvId ? cvVoiceCvId : null;
  const zone: AssistantZone = activeCvId ? "cv" : authenticated ? "app" : "vitrine";
  const panelId = useId();
  const assistantName = appConfig.assistantFirstName || appConfig.assistantName || "Noga";

  const greeting = useMemo(
    () =>
      activeCvId
        ? voiceCvCopy.greeting(firstName)
        : zone === "app"
          ? assistantCopy.greetingApp(firstName)
          : assistantCopy.greetingVitrine(firstName),
    [activeCvId, zone, firstName],
  );
  const peekLine = useMemo(() => assistantPeekLine(pathname, zone), [pathname, zone]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [tab, setTab] = useState<"chat" | "parler" | "historique">("chat");
  const [dragging, setDragging] = useState(false);
  const [panelOffset, setPanelOffset] = useState<DockOffset>({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragMoved = useRef(false);
  const dockX = useMotionValue(0);
  const dockY = useMotionValue(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const saved = loadDockOffset(zone);
    dockX.set(saved.x);
    dockY.set(saved.y);
  }, [zone, dockX, dockY]);

  useEffect(() => {
    if (open) return;
    const saved = loadDockOffset(zone);
    dockX.set(saved.x);
    dockY.set(saved.y);
  }, [open, zone, dockX, dockY]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      recognitionRef.current?.stop();
      setListening(false);
      if (activeCvId) {
        setCvVoiceCvId(null);
      }
      setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (activeCvId) return;
      const target = event.target as Node | null;
      if (target && panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, setOpen, activeCvId, setCvVoiceCvId]);

  useEffect(() => {
    if (activeCvId && !open) {
      setOpen(true);
    }
  }, [activeCvId, open, setOpen]);

  useEffect(() => {
    if (activeCvId) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
  }, [activeCvId, listening]);

  useEffect(() => {
    if (!activeCvId) return;
    setMessages([{ role: "assistant", content: voiceCvCopy.greeting(firstName) }]);
    setTab("parler");
  }, [activeCvId, firstName]);

  useEffect(() => {
    if (activeCvId) return;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
    } catch {
      /* ignore */
    }
  }, [activeCvId]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }, [messages, reduceMotion]);

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function closeAssistant() {
    stopListening();
    if (activeCvId) {
      setCvVoiceCvId(null);
    }
    setOpen(false);
  }

  function speak(text: string) {
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.speak(utterance);
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    if (zone !== "vitrine" && !canUseAi(user)) {
      toast({
        title: "Quota IA atteint",
        description: aiTrialsHint(user) || "Passez à un plan supérieur pour continuer.",
        variant: "destructive",
      });
      return;
    }
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    setPending(true);
    try {
      const cv =
        activeCvId != null ? useCvStore.getState().getById(activeCvId) ?? null : null;
      const payload = await sendAssistantMessage({
        message: content,
        history: trimAssistantHistory(messages),
        zone,
        cv: cv ? snapshotCvForAssistant(cv) : undefined,
      });
      const { reply, patch } = unwrapAssistantReply(payload);
      if (activeCvId && cv && patchHasContent(patch)) {
        const next = applyCvPatch(cv, patch);
        await upsertCv({ ...next, completion: completionOf(next) }, true);
        toast({
          title: "CV mis à jour",
          description: "Les informations dictées ont été ajoutées à votre CV.",
          variant: "success",
        });
      }
      const finalReply =
        reply ||
        (activeCvId ? "C'est noté. Continuez à me parler pour compléter votre CV." : localReply(content));
      setMessages([...history, { role: "assistant", content: finalReply }]);
      speak(finalReply);
      if (zone !== "vitrine") void syncPlanCapabilities();
    } catch {
      const reply = activeCvId
        ? "Je n'ai pas pu traiter votre message. Réessayez ou continuez au clavier dans l'éditeur."
        : localReply(content);
      setMessages([...history, { role: "assistant", content: reply }]);
      speak(reply);
    } finally {
      setPending(false);
    }
  }

  function startListening() {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: activeCvId
            ? voiceCvCopy.unsupported
            : "La reconnaissance vocale n'est pas disponible dans ce navigateur. Écrivez dans le fil, le clavier reste toujours actif.",
        },
      ]);
      return;
    }
    if (listening) return;
    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) void send(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: activeCvId ? voiceCvCopy.micDenied : assistantCopy.micDenied,
        },
      ]);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setTab("parler");
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: activeCvId ? voiceCvCopy.micDenied : assistantCopy.micDenied,
        },
      ]);
    }
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    startListening();
  }

  useEffect(() => {
    if (!open || !activeCvId || assistantListenTick === 0) return;
    const id = window.setTimeout(() => startListening(), 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par assistantListenTick
  }, [open, activeCvId, assistantListenTick]);

  const chips = activeCvId
    ? [
        "Je m'appelle…",
        "Ajoute une expérience",
        "Mes compétences",
        "Rédige mon accroche",
      ]
    : [
        "Rédiger mon expérience",
        "Améliorer mes compétences",
        "Optimiser pour les ATS",
        "Corriger mon CV",
      ];

  const openFab = () => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    const offset = { x: dockX.get(), y: dockY.get() };
    persistDockOffset(zone, offset);
    setPanelOffset(clampAssistantPanelOffset(offset));
    setOpen(true);
  };

  if (isAdmin) return null;

  return (
    <div
      ref={boundsRef}
      className={cn("pointer-events-none fixed inset-0", zone === "app" ? "z-[45]" : "z-50")}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            key="noga-panel"
            ref={panelRef}
            className={cn(
              "pointer-events-auto absolute",
              "inset-x-2 h-auto w-auto",
              zone === "app"
                ? "top-[calc(3.75rem+env(safe-area-inset-top,0px))]"
                : "top-[4.35rem]",
              "bottom-[max(1rem,calc(0.75rem+var(--app-tabbar-offset)))] sm:bottom-5",
              "sm:inset-x-auto sm:right-5 sm:top-auto sm:h-[min(34rem,calc(100dvh-5.5rem))] sm:w-[22rem]",
            )}
            style={{
              x: isDesktop ? panelOffset.x : 0,
              y: isDesktop ? panelOffset.y : 0,
              transformOrigin: "bottom right",
            }}
            initial={
              reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.98,
                    filter: "blur(4px)",
                    transition: { duration: 0.2, ease: exitEase },
                  }
            }
            transition={reduceMotion ? { duration: 0 } : panelSpring}
          >
            <section
              id={panelId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={`${panelId}-title`}
              className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-brand"
            >
              <div className="flex items-center justify-between gap-2 border-b border-gris p-4">
                <div className="flex items-center gap-3">
                  <span className="relative shrink-0 overflow-visible">
                    <span className="block overflow-hidden rounded-full">
                      <AssistantAvatar size={40} framed />
                    </span>
                    <span
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-succes"
                      aria-hidden
                    />
                  </span>
                  <div>
                    <h2
                      id={`${panelId}-title`}
                      className="font-display text-sm font-semibold text-navy"
                    >
                      {assistantName}
                    </h2>
                    <p className="text-xs text-succes">{assistantCopy.online}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={muted ? assistantCopy.unmute : assistantCopy.mute}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Fermer"
                    onClick={closeAssistant}
                  >
                    <X />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1 px-3 pt-3">
                {(
                  [
                    { id: "chat" as const, label: "Discussion" },
                    { id: "parler" as const, label: "Parler" },
                    { id: "historique" as const, label: "Historique" },
                  ]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "rounded-xl px-3 py-1 text-xs font-medium",
                      tab === item.id ? "bg-principale text-white" : "bg-indigo-clair text-navy/70",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <ScrollArea className="flex-1 px-3 py-3">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "mb-3 flex items-end gap-2",
                      message.role === "user" && "flex-row-reverse",
                    )}
                  >
                    {message.role === "assistant" ? (
                      <AssistantAvatar size={26} className="mb-0.5 rounded-full" />
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                        message.role === "assistant"
                          ? "bg-indigo-clair text-navy"
                          : "bg-principale text-white",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {tab === "chat" && messages.length <= 2 ? (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {chips.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => void send(chip)}
                        className="rounded-xl bg-[#F8FAFC] px-3 py-1 text-xs text-navy hover:bg-indigo-clair"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </ScrollArea>
              <form
                className="border-t border-gris p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(input);
                }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={activeCvId ? voiceCvCopy.placeholder : assistantCopy.placeholder}
                    disabled={pending || (zone !== "vitrine" && !canUseAi(user))}
                  />
                  <Button type="submit" size="icon" disabled={pending || !input.trim() || (zone !== "vitrine" && !canUseAi(user))}>
                    <Send />
                  </Button>
                </div>
                {listening ? (
                  <VoiceGraph active size="md" className="mt-3 w-full" />
                ) : null}
                <button
                  type="button"
                  onClick={toggleMic}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-clair py-2 text-sm text-principale"
                >
                  {listening ? <MicOff /> : <Mic />}
                  {listening ? assistantCopy.listening : assistantCopy.clickToSpeak}
                </button>
                <p className="mt-2 text-center text-[11px] text-navy/50">
                  {assistantName} répond aussi au clavier.
                </p>
              </form>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        className={cn(
          "pointer-events-auto absolute right-3 select-none sm:right-5",
          "bottom-[max(1rem,calc(0.75rem+var(--app-tabbar-offset)))] sm:bottom-5",
          open && "invisible pointer-events-none",
          dragging ? "z-[1] cursor-grabbing" : "cursor-grab",
        )}
        aria-hidden={open}
        style={{ x: dockX, y: dockY }}
        drag
        dragListener={!open}
        dragConstraints={boundsRef}
        dragMomentum={false}
        dragElastic={0.12}
        dragTransition={{ bounceStiffness: 420, bounceDamping: 32 }}
        onDragStart={() => setDragging(true)}
        onDrag={(_, info) => {
          if (Math.hypot(info.offset.x, info.offset.y) > DRAG_CLICK_PX) {
            dragMoved.current = true;
          }
        }}
        onDragEnd={() => {
          setDragging(false);
          let x = dockX.get();
          let y = dockY.get();
          if (Math.hypot(x, y) < 28) {
            x = 0;
            y = 0;
            dockX.set(0);
            dockY.set(0);
          }
          persistDockOffset(zone, { x, y });
          window.setTimeout(() => {
            dragMoved.current = false;
          }, 120);
        }}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, filter: "blur(4px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={reduceMotion ? { duration: 0 } : panelSpring}
      >
        <motion.div
          className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-end sm:gap-2"
          animate={dragging || reduceMotion ? { y: 0 } : { y: [0, -6, 0] }}
          transition={
            dragging || reduceMotion
              ? { duration: 0 }
              : { duration: 4.6, repeat: Infinity, ease: floatEase }
          }
        >
          <AnimatePresence>
            {!open && (
              <motion.button
                type="button"
                initial={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, x: 10, y: 6, filter: "blur(4px)" }
                }
                animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        y: 6,
                        filter: "blur(4px)",
                        transition: { duration: 0.18, ease: exitEase },
                      }
                }
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0, delay: 0.28 }
                }
                onClick={openFab}
                className="mb-0.5 hidden max-w-[min(13.5rem,calc(100vw-6rem))] rounded-2xl rounded-br-md bg-white px-3 py-2 text-left text-[12px] leading-snug text-navy shadow-brand ring-1 ring-black/5 md:block"
              >
                <span className="noga-peek-nudge block">
                  <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-principale">
                    {assistantName}
                  </span>
                  <span className="line-clamp-2">{peekLine}</span>
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`Discuter avec ${assistantName}. Glisser pour déplacer.`}
            title="Glisser pour déplacer"
            onClick={openFab}
            whileHover={reduceMotion || dragging ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion || dragging ? undefined : { scale: 0.96 }}
            transition={{ type: "spring", duration: 0.32, bounce: 0 }}
            className="relative rounded-full ring-2 ring-white"
          >
            <AssistantAvatar size={56} framed className="h-12 w-12 sm:h-14 sm:w-14" />
            <span
              className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-succes sm:h-3 sm:w-3"
              aria-hidden
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
