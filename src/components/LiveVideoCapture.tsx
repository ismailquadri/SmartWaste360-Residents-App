import { useLanguage } from "@/lib/language";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RefreshCw, RotateCcw, X, Zap } from "lucide-react";
import { phonePortal } from "@/lib/portal-target";

const MAX_SECONDS = 15;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Props = {
  open: boolean;
  location?: string;
  onClose: () => void;
  onDone: (file: File) => void;
  /** Called when live camera isn't available, so the page can fall back to the phone's camera app. */
  onFallback: () => void;
};

export function LiveVideoCapture({ open, location, onClose, onDone, onFallback }: Props) {
  const { t: tr, localize } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const accRef = useRef(0);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(0);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [phase, setPhase] = useState<"starting" | "ready" | "recording" | "paused" | "review" | "error">("starting");
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<{ url: string; file: File } | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [error, setError] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setPhase("starting");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Live camera isn't supported here.");
      setPhase("error");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = s;
      const track = s.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorchOk(!!caps.torch);
      setTorch(false);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("ready");
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(name === "NotAllowedError" ? "Camera is blocked. Allow camera and mic to go live." : "Couldn't open the camera.");
      setPhase("error");
    }
  }, [facing, stopStream]);

  useEffect(() => {
    if (!open) return;
    setClip(null);
    setElapsed(0);
    void startStream();
    return () => {
      recRef.current && recRef.current.state !== "inactive" && recRef.current.stop();
      stopStream();
    };
  }, [open, startStream, stopStream]);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => {
      const s = accRef.current + (performance.now() - startRef.current) / 1000;
      setElapsed(Math.min(s, MAX_SECONDS));
      if (s >= MAX_SECONDS) stopRec();
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startRec = () => {
    const s = streamRef.current;
    if (!s) return;
    const types = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `live-${Date.now()}.${ext}`, { type });
      setClip({ url: URL.createObjectURL(blob), file });
      setPlayPos(0);
      setPlaying(false);
      setPhase("review");
    };
    recRef.current = rec;
    rec.start(250);
    startRef.current = performance.now();
    accRef.current = 0;
    setElapsed(0);
    setPhase("recording");
    navigator.vibrate?.(30);
  };
  const pauseRec = () => {
    const rec = recRef.current;
    if (rec?.state !== "recording") return;
    rec.pause();
    accRef.current += (performance.now() - startRef.current) / 1000;
    setElapsed(Math.min(accRef.current, MAX_SECONDS));
    setPhase("paused");
    navigator.vibrate?.(15);
  };
  const resumeRec = () => {
    const rec = recRef.current;
    if (rec?.state !== "paused") return;
    startRef.current = performance.now();
    rec.resume();
    setPhase("recording");
    navigator.vibrate?.(15);
  };
  const togglePlay = () => {
    const v = reviewRef.current;
    if (!v) return;
    if (v.paused) void v.play(); else v.pause();
  };
  const seek = (t: number) => {
    const v = reviewRef.current;
    if (v) v.currentTime = t;
    setPlayPos(t);
  };
  const stopRec = () => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    navigator.vibrate?.(20);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorchOk(false);
    }
  };

  const retake = () => {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setElapsed(0);
    setPhase("ready");
  };
  const close = () => {
    if (clip) URL.revokeObjectURL(clip.url);
    stopStream();
    onClose();
  };
  const use = () => {
    if (!clip) return;
    stopStream();
    onDone(clip.file);
  };

  if (!open || typeof document === "undefined") return null;
  const target = phonePortal() ?? document.body;
  const fixed = target === document.body ? "fixed" : "absolute";
  const short = phase === "review" && elapsed < 3;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={tr("Live video")} className={`${fixed} inset-0 z-[80] flex flex-col bg-ink text-primary-foreground`}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className={`absolute inset-0 size-full object-cover ${phase === "review" ? "hidden" : ""} ${facing === "user" ? "-scale-x-100" : ""}`}
          muted
          playsInline
          autoPlay
        />
        {phase === "review" && clip && !playing && (
          <button type="button" onClick={togglePlay} aria-label={tr("Play clip")} className="absolute left-1/2 top-1/2 z-10 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink/60">
            <Play className="size-7 fill-current" />
          </button>
        )}
        {phase === "review" && clip && (
          <video
            ref={reviewRef}
            src={clip.url}
            className="absolute inset-0 size-full bg-ink object-contain"
            playsInline
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); }}
            onTimeUpdate={(e) => setPlayPos(Math.min(e.currentTarget.currentTime, elapsed))}
          />
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button type="button" onClick={close} aria-label={tr("Close camera")} className="grid size-11 place-items-center rounded-full bg-ink/60">
            <X className="size-5" />
          </button>
          {phase === "recording" || phase === "paused" ? (
            <span role="status" aria-live="polite" aria-atomic="true" className={`flex items-center gap-2 rounded-full px-3 ${phase === "paused" ? "bg-ink/70" : "bg-destructive"} py-1.5 font-mono text-[13px] font-semibold tabular-nums`}>
              <span className={`size-2 rounded-full bg-primary-foreground ${phase === "recording" ? "animate-pulse" : ""}`} /> {localize(phase === "paused" ? "PAUSED" : "LIVE")} · {localize(fmt(elapsed))}
            </span>
          ) : (
            <span className="rounded-full bg-ink/60 px-3 py-1.5 font-mono text-[12px] uppercase tracking-wide">
              {localize(phase === "review" ? `Review · ${fmt(elapsed)}` : `Live · ${fmt(0)} / ${fmt(MAX_SECONDS)}`)}
            </span>
          )}
          {torchOk && phase !== "review" ? (
            <button type="button" onClick={toggleTorch} aria-pressed={torch} aria-label={tr("Torch")} className={`grid size-11 place-items-center rounded-full ${torch ? "bg-primary text-ink" : "bg-ink/60"}`}>
              <Zap className="size-5" />
            </button>
          ) : (
            <span className="size-11" />
          )}
        </div>

        {/* Progress to 15s */}
        {(phase === "recording" || phase === "paused") && (
          <div className="absolute inset-x-3 top-[60px] h-1 overflow-hidden rounded-full bg-primary-foreground/25">
            <div className="h-full bg-destructive transition-[width] duration-200" style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }} />
          </div>
        )}

        {/* Framing guide + stamp */}
        {(phase === "ready" || phase === "recording" || phase === "paused") && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 bottom-24 top-24 rounded-[10px] border border-dashed border-primary-foreground/40" />
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 font-mono text-[11px]">
              <span className="truncate rounded bg-ink/60 px-2 py-1">{location || "Lagos"}</span>
              <span className="shrink-0 rounded bg-ink/60 px-2 py-1">{localize(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</span>
            </div>
            {phase === "paused" && (
              <p className="absolute inset-x-0 top-[72px] text-center text-[13px]">
                <span className="rounded-full bg-ink/60 px-3 py-1">{tr("Paused · move, then resume")}</span>
              </p>
            )}
            {phase === "ready" && (
              <p className="absolute inset-x-0 top-[72px] text-center text-[13px]">
                <span className="rounded-full bg-ink/60 px-3 py-1">{tr("Pan slowly · show a landmark")}</span>
              </p>
            )}
          </>
        )}

        {phase === "starting" && <p className="absolute inset-0 grid place-items-center text-[14px]">{tr("Opening camera…")}</p>}
        {phase === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="grid gap-3">
              <p className="text-[15px] font-semibold">{localize(error)}</p>
              <button type="button" onClick={() => void startStream()} className="min-h-[48px] rounded-[10px] bg-primary-foreground/15 font-semibold">{tr("Try again")}</button>
              <button type="button" onClick={() => { stopStream(); onFallback(); }} className="min-h-[48px] rounded-[10px] bg-primary font-semibold text-ink">{tr("Use phone camera")}</button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex min-h-[120px] shrink-0 items-center justify-between px-6 py-3">
        {phase === "review" ? (
          <div className="grid w-full gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={togglePlay} aria-label={localize(playing ? "Pause clip" : "Play clip")} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
                {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </button>
              <input
                type="range"
                aria-label={tr("Seek")}
                min={0}
                max={Math.max(elapsed, 0.1)}
                step={0.1}
                value={playPos}
                onChange={(e) => seek(Number(e.target.value))}
                className="min-w-0 flex-1 accent-[var(--color-ember)]"
              />
              <span className="shrink-0 font-mono text-[12px] tabular-nums opacity-80">{localize(fmt(playPos))} / {localize(fmt(elapsed))}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={retake} className="flex min-h-[48px] items-center gap-2 rounded-[10px] bg-primary-foreground/15 px-4 font-semibold">
                <RotateCcw className="size-4" />{" "}{tr("Retake")}</button>
              <div className="truncate text-center text-[12px] opacity-70">{localize(short ? "A bit short" : "Looks good?")}</div>
              <button type="button" onClick={use} className="min-h-[48px] rounded-[10px] bg-ember px-5 font-semibold text-ember-foreground">{tr("Use video")}</button>
            </div>
          </div>
        ) : (
          <>
            {phase === "recording" || phase === "paused" ? (
              <button
                type="button"
                onClick={phase === "recording" ? pauseRec : resumeRec}
                aria-label={localize(phase === "recording" ? "Pause recording" : "Resume recording")}
                className="grid size-11 place-items-center rounded-full bg-primary-foreground/15"
              >
                {phase === "recording" ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </button>
            ) : (
              <span className="w-11 text-center font-mono text-[12px] opacity-70">{localize(MAX_SECONDS)}{tr("s")}</span>
            )}
            <button
              type="button"
              disabled={phase !== "ready" && phase !== "recording" && phase !== "paused"}
              onClick={phase === "ready" ? startRec : stopRec}
              aria-label={localize(phase === "ready" ? "Start recording" : "Stop recording")}
              className="grid size-[76px] place-items-center rounded-full border-4 border-primary-foreground disabled:opacity-40"
            >
              <span className={`bg-destructive transition-all ${phase === "recording" || phase === "paused" ? "size-7 rounded-[6px]" : "size-[60px] rounded-full"}`} />
            </button>
            <button
              type="button"
              disabled={phase !== "ready"}
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
              aria-label={tr("Flip camera")}
              className="grid size-11 place-items-center rounded-full bg-primary-foreground/15 disabled:opacity-40"
            >
              <RefreshCw className="size-5" />
            </button>
          </>
        )}
      </div>
    </div>,
    target,
  );
}
