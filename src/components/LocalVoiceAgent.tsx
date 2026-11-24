import { useLanguage } from "@/lib/language";
import { Pause, Play, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import { FluxioMic as Mic } from "@/components/icons/FluxioIcons";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IosButton, IosSection } from "@/components/ios";
import { MediaUndoBanner } from "@/components/MediaUndoBanner";
import { useMediaUndo } from "@/hooks/use-media-undo";
import {
  buildDialectReport,
  type DialectReport,
  DIALECTS,
  getDialect,
  type DialectCode,
} from "@/lib/voice-agent";
import { speakAgentPhrase } from "@/lib/voice-tts.functions";
import type { ReportDraft } from "@/lib/report-ai";
import { cn } from "@/lib/utils";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function clockText(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function LocalVoiceAgent({
  address,
  area,
  onDraftReady,
  initialTranscript = "",
  onTranscriptChange,
}: {
  address?: string | undefined;
  area?: string | undefined;
  onDraftReady: (draft: DialectReport, rawTranscript: string) => void;
  initialTranscript?: string;
  onTranscriptChange?: (transcript: string) => void;
}) {
  const { t: tr, localize, language } = useLanguage();
  const [dialect, setDialect] = useState<DialectCode>(language);
  const [transcript, setTranscript] = useState(initialTranscript);
  useEffect(() => { onTranscriptChange?.(transcript); }, [transcript, onTranscriptChange]);
  const [listening, setListening] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [agentMessage, setAgentMessage] = useState(() => getDialect("pcm").greeting);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!listening) return;
    setElapsed(0);
    elapsedRef.current = 0;
    const t = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(t);
  }, [listening]);
  const [micNote, setMicNote] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const elapsedRef = useRef(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recordingUrls = useRef(new Set<string>());
  const releaseRecording = (clip: { url: string; seconds: number }) => {
    if (recordingUrls.current.delete(clip.url)) URL.revokeObjectURL(clip.url);
  };
  const recordingUndo = useMediaUndo(releaseRecording);
  useEffect(() => {
    const urls = recordingUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  const BARS = 28;
  const [levels, setLevels] = useState<number[]>(() => Array(28).fill(0));
  const [level, setLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevels(Array(BARS).fill(0));
    setLevel(0);
  };
  const startMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let last = 0;
      const tick = (t: number) => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = ((buf[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        if (t - last > 70) {
          last = t;
          setLevel(rms);
          setLevels((prev) => [...prev.slice(1), rms]);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* meter optional */
    }
  };
  const transcriptId = useId();
  const spec = getDialect(dialect);
  useEffect(() => {
    setDialect(language);
    setAgentMessage(getDialect(language).greeting);
  }, [language]);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      wantRef.current = false;
      try {
        recRef.current?.stop();
      } catch {
        /* ignore cleanup errors */
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      playbackRef.current?.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef(new Map<string, string>());
  const browserSpeak = (phrase: string, langCode: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.lang = langCode;
      utter.rate = 0.96;
      const voices = window.speechSynthesis.getVoices();
      const match =
        voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(langCode.split("-")[0]!.toLowerCase())) ??
        voices.find((v) => v.lang.toLowerCase().startsWith("en-ng"));
      if (match) utter.voice = match;
      window.speechSynthesis.speak(utter);
    } catch {
      /* SpeechSynthesis unavailable */
    }
  };
  const speak = useCallback(
    async (phrase: string, langCode: string, code: DialectCode = dialect) => {
      if (voiceMuted || typeof window === "undefined") return;
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      const cacheKey = `${code}|${phrase}`;
      try {
        let url = cacheRef.current.get(cacheKey);
        if (!url) {
          const res = await speakAgentPhrase({ data: { text: phrase.slice(0, 400), dialect: code } });
          if (!res.audio) throw new Error(res.error ?? "no audio");
          const bin = atob(res.audio);
          const buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          url = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
          cacheRef.current.set(cacheKey, url);
        }
        const el = audioRef.current ?? new Audio();
        audioRef.current = el;
        el.src = url;
        await el.play();
      } catch {
        browserSpeak(phrase, langCode);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceMuted, dialect],
  );

  const switchDialect = (next: DialectCode) => {
    setDialect(next);
    const nextSpec = getDialect(next);
    setAgentMessage(nextSpec.greeting);
    setMicNote(null);
    if (listening) stopRecording();
    speak(nextSpec.greeting, nextSpec.speechLang, next);
  };

  const wantRef = useRef(false);
  const baseRef = useRef("");

  const startAudioCapture = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startMeter(stream);
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined;
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        chunksRef.current = [];
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          recordingUrls.current.add(url);
          setRecordingUrl((old) => {
            if (old) releaseRecording({ url: old, seconds: 0 });
            return url;
          });
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
    } catch {
      /* mic capture unavailable; speech-to-text still works */
    }
  };

  const stopAudioCapture = () => {
    stopMeter();
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!recordingUrl) return;
    const el = playbackRef.current ?? new Audio();
    playbackRef.current = el;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    el.src = recordingUrl;
    el.onended = () => setPlaying(false);
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  const clearRecording = () => {
    recordingUndo.clear();
    playbackRef.current?.pause();
    setPlaying(false);
    setRecordingUrl((old) => {
      if (old) releaseRecording({ url: old, seconds: 0 });
      return null;
    });
  };

  const deleteRecording = () => {
    if (!recordingUrl) return;
    playbackRef.current?.pause();
    setPlaying(false);
    recordingUndo.remove({ url: recordingUrl, seconds: recordingSecs });
    setRecordingUrl(null);
  };

  const stopRecording = () => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setRecordingSecs(elapsedRef.current);
    stopAudioCapture();
    setListening(false);
    if (transcript.trim().length >= 6) setAgentMessage(spec.replyReady);
  };

  const startSession = (lang: string) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = true;
    let sessionFinal = "";
    rec.onresult = (ev) => {
      let interim = "";
      sessionFinal = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (!r) continue;
        if (r.isFinal) sessionFinal += r[0].transcript + " ";
        else interim += r[0].transcript + " ";
      }
      setTranscript((baseRef.current + " " + sessionFinal + interim).replace(/\s+/g, " ").trim());
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
        setMicNote("Microphone blocked. Allow mic access, or type below.");
      } else if (ev.error === "language-not-supported" && lang !== "en-NG") {
        rec.onend = null;
        startSession("en-NG");
      }
      // no-speech / network: onend restarts while still recording
    };
    rec.onend = () => {
      baseRef.current = (baseRef.current + " " + sessionFinal).replace(/\s+/g, " ").trim();
      if (wantRef.current) {
        try {
          startSession(lang);
          return;
        } catch {
          /* fall through */
        }
      }
      wantRef.current = false;
      setListening(false);
    };
    recRef.current = rec;
    rec.start();
  };

  const toggleMic = () => {
    if (listening) {
      stopRecording();
      return;
    }
    if (!getSpeechRecognitionCtor()) {
      setSpeechSupported(false);
      setMicNote("Voice typing isn’t supported in this browser. Type below instead.");
      return;
    }
    setMicNote(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    audioRef.current?.pause();
    playbackRef.current?.pause();
    setPlaying(false);
    clearRecording();
    baseRef.current = transcript.trim();
    try {
      wantRef.current = true;
      startSession(spec.speechLang);
      setListening(true);
      void startAudioCapture();
    } catch {
      wantRef.current = false;
      setListening(false);
      setMicNote("Microphone unavailable here. Type below instead.");
    }
  };

  const handleSample = (sampleText: string) => {
    setTranscript(sampleText);
    setAgentMessage(spec.replyReady);
    setMicNote(null);
    speak(sampleText, spec.speechLang);
  };

  const prepareReport = () => {
    const clean = transcript.trim();
    if (clean.length < 6) return;
    const drafted = buildDialectReport(transcript, dialect, { address, area });
    setAgentMessage(spec.replyReady);
    speak(spec.replyReady, spec.speechLang);
    onDraftReady(drafted, transcript);
  };

  return (
    <div className="space-y-5">
      {/* Dialect Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="eyebrow">{tr("Choose dialect")}</span>
          <button
            type="button"
            onClick={() => {
              const nextMuted = !voiceMuted;
              setVoiceMuted(nextMuted);
              if (nextMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel(); audioRef.current?.pause();
              }
            }}
            aria-pressed={!voiceMuted}
            aria-label={localize(voiceMuted ? "Unmute voice agent" : "Mute voice agent")}
            className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-foreground ring-1 ring-black/[0.08]"
          >
            {voiceMuted ? (
              <>
                <VolumeX className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>{tr("Muted")}</span>
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-primary" aria-hidden="true" />
                <span>{tr("Voice On")}</span>
              </>
            )}
          </button>
        </div>

        <div
          role="radiogroup"
          aria-label={tr("Local reporting dialect")}
          className="flex flex-wrap gap-1.5"
        >
          {DIALECTS.map((d) => {
            const active = d.code === dialect;
            return (
              <button
                key={d.code}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => switchDialect(d.code)}
                className={cn(
                  "min-h-[44px] rounded-full px-4 py-2 text-[14px] font-extrabold transition-all",
                  active
                    ? "bg-ember text-ember-foreground shadow-sm"
                    : "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-muted",
                )}
              >
                {localize(d.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Siri-style Agent Console */}
      <div className="ios-card overflow-hidden">
        <div className="bg-card px-4 pb-5 pt-4 text-center">
          {/* Assistant Spoken Prompt */}
          <div className="border-b border-border pb-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">{tr("LAWMA Local Agent ·")}{" "}{localize(spec.nativeName)}
              </span>
              <button
                type="button"
                onClick={() => speak(agentMessage, spec.speechLang)}
                aria-label={tr("Replay voice prompt")}
                className="inline-flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/15"
              >
                <Volume2 className="size-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[15px] leading-[21px] text-foreground">{agentMessage}</p>
          </div>

          {/* Voice record button */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {listening && (
              <div className="flex w-full flex-col items-center gap-3">
                <div className="flex w-full max-w-[300px] items-center gap-3">
                  <span role="status" aria-live="polite" aria-atomic="true" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 font-mono text-[13px] font-semibold tabular-nums text-destructive">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive animate-pulse" />
                    <span className="sr-only">{tr("Recording time:")}{" "}</span>
                    {localize(clockText(elapsed))}
                  </span>
                  <div aria-hidden="true" className="flex h-12 min-w-0 flex-1 items-center justify-center gap-[3px]">
                    {levels.map((v, i) => (
                      <span
                        key={i}
                        className={cn("w-[4px] rounded-full transition-[height] duration-75", v > 0.04 ? "bg-destructive" : "bg-border")}
                        style={{ height: `${Math.max(4, Math.round(v * 48))}px`, opacity: 0.35 + (i / BARS) * 0.65 }}
                      />
                    ))}
                  </div>
                </div>
                <p aria-live="polite" className="text-[12px] text-muted-foreground">{localize(level > 0.04 ? "Listening…" : "Speak now")}</p>
              </div>
            )}
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={listening}
              aria-label={localize(listening ? "Stop recording" : `Speak report in ${spec.label}`)}
              style={listening ? { outline: `${Math.round(level * 14)}px solid color-mix(in oklab, var(--color-destructive) 18%, transparent)`, outlineOffset: 2 } : undefined}
              className={cn(
                "grid size-[80px] place-items-center rounded-full transition-[colors,outline-width] duration-75 duration-150 focus-visible:outline-none active:scale-95",
                listening ? "bg-destructive/10 text-destructive" : "bg-ember text-ember-foreground hover:brightness-105",
              )}
            >
              {listening ? (
                <span aria-hidden="true" className="size-7 rounded-[6px] bg-destructive" />
              ) : (
                <Mic className="size-9" />
              )}
            </button>
          </div>

          {recordingUrl && !listening && (
            <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-card px-3 py-2.5 text-left ring-1 ring-foreground/10">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={localize(playing ? "Pause recording" : "Play recording")}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-ember text-ember-foreground transition-colors hover:brightness-105 active:scale-95"
              >
                {playing ? (
                  <Pause className="size-4" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 size-4" aria-hidden="true" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">{tr("Your recording")}</p>
                <p className="font-mono text-[12px] tabular-nums text-muted-foreground">{localize(clockText(recordingSecs))}</p>
              </div>
              <button
                type="button"
                onClick={deleteRecording}
                aria-label={tr("Delete recording")}
                className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive active:scale-95"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {recordingUndo.pending.length > 0 && !listening && (
            <div className="mt-3">
              <MediaUndoBanner label={tr("Recording removed")} onUndo={() => {
                const clip = recordingUndo.restore().at(-1)?.item;
                if (!clip) return;
                setRecordingUrl(clip.url);
                setRecordingSecs(clip.seconds);
              }} />
              <p className="mt-1 text-left text-[11px] text-muted-foreground">{tr("Undo available for 10 seconds. Your words are kept.")}</p>
            </div>
          )}

          <p aria-live="polite" className="mt-3 text-[13px] font-medium text-muted-foreground">
            {localize(listening ? "Tap the square to stop" : speechSupported ? `Tap mic to speak in ${spec.label}` : "Type or pick a dialect phrase below")}
          </p>

          {micNote && (
            <p className="mt-2 rounded-[10px] bg-ember/10 px-3 py-2 text-[12px] font-medium text-[#9a3405]">
              {localize(micNote)}
            </p>
          )}
        </div>

        {/* Live Transcript Input */}
        <div className="bg-card px-2 py-3">
          <div>
          <label htmlFor={transcriptId} className="block text-[12px] font-medium text-muted-foreground">{tr("Your voice or text in")}{" "}{localize(spec.label)}
          </label>
          <textarea
            id={transcriptId}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            placeholder={tr("Speak into mic or type in {0}…", spec.label)}
            className="mt-1.5 w-full resize-none bg-transparent text-[16px] leading-[22px] text-foreground placeholder:text-[#3c3c43]/40 focus:outline-none"
          />
          </div>
          <div className="mt-3 px-2">
            <IosButton
              tone="primary"
              disabled={transcript.trim().length < 6}
              onClick={prepareReport}
            >
              <Sparkles className="size-4" aria-hidden="true" />{tr("Translate & prepare LAWMA report")}</IosButton>
          </div>
        </div>
      </div>

      {/* Quick One-Tap Dialect Samples (useful for demos / browsers without mic) */}
      <IosSection
        header={tr("Try {0} voice samples", spec.label)}
        footer={tr("Tap any example to hear the dialect prompt and test instant translation to LAWMA dispatch.")}
      >
        {spec.samples.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => handleSample(s.text)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] active:bg-[#d1d1d6]/50"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
            >
              <Mic className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-foreground">{localize(s.label)}</span>
              <span className="mt-0.5 block text-[13px] leading-[18px] text-muted-foreground">
                “{s.text}”
              </span>
            </span>
          </button>
        ))}
      </IosSection>
    </div>
  );
}
