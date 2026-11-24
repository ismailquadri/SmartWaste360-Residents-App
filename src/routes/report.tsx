import { useLanguage } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, Sparkles, Video, X } from "lucide-react";
import { FluxioStar as Award, FluxioCamera as Camera, FluxioCheck as Check, FluxioEyeScan as EyeOff, FluxioShieldAlert as ShieldAlert } from "@/components/icons/FluxioIcons";
import { useEffect, useId, useRef, useState } from "react";
import type { DialectReport } from "@/lib/voice-agent";
import { z } from "zod";
import { PageTitle, Phone } from "@/components/app";
import { LocalVoiceAgent } from "@/components/LocalVoiceAgent";
import { LiveVideoCapture } from "@/components/LiveVideoCapture";
import { MediaUndoBanner } from "@/components/MediaUndoBanner";
import { useMediaUndo, restoreMedia } from "@/hooks/use-media-undo";
import { readReportDraft, saveReportDraft, REPORT_DRAFT_KEY } from "@/lib/report-draft-storage";
import { Button } from "@/components/ui/button";
import { PartnerLogo } from "@/components/PartnerLogo";
import {
  IosBadge,
  IosButton,
  IosRow,
  IosSection,
  IosSegmentedControl,
} from "@/components/ios";
import { meta } from "@/lib/meta";
import { REPORT_CATEGORIES, type ReportDraft } from "@/lib/report-ai";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({
  validateSearch: z.object({ mode: z.enum(["voice", "text", "whistle"]).optional() }),
  head: () => meta("Report & Whistleblower", "Speak in Pidgin, Yorùbá, Igbo, Hausa or submit an EXIF-scrubbed whistleblower tip."),
  component: ReportPage,
});

const modeOptions = [
  { value: "voice" as const, label: "Voice" },
  { value: "text" as const, label: "Type" },
  { value: "whistle" as const, label: "Whistleblower" },
] as const;

const whistleCategories = [
  "Night-Time Illegal Dump",
  "Doorstep Cash Extortion",
  "Unregistered Cart Pusher",
  "Blocked Canal / Drainage Dump",
] as const;

type Evidence = { name: string; kind: "photo" | "video"; url: string };

function ReportPage() {
  const { t: tr, localize } = useLanguage();
  const search = Route.useSearch();
  const { model, partner, premise, report, submitWhistleblower } = useStore();
  const [mode, setMode] = useState<"voice" | "text" | "whistle">(search.mode ?? "voice");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [sent, setSent] = useState("");
  const [voiceReview, setVoiceReview] = useState<DialectReport | null>(null);
  const [location, setLocation] = useState([premise?.address, premise?.area].filter(Boolean).join(", "));
  const [confirmed, setConfirmed] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const saved = readReportDraft(localStorage);
    if (saved) {
      setText(saved.text);
      setLocation(saved.location);
      setVoiceTranscript(saved.voiceTranscript);
      setDraft(saved.draft);
    }
    setDraftLoaded(true);
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!draftLoaded || sent) return;
    setDraftSaved(saveReportDraft(localStorage, { text, location, voiceTranscript, draft }));
  }, [draftLoaded, sent, text, location, voiceTranscript, draft]);
  const locId = useId();
  useEffect(() => setConfirmed(false), [draft, location]);
  useEffect(() => {
    if (draft && !location) setLocation([premise?.address, premise?.area].filter(Boolean).join(", "));
  }, [draft, location, premise?.address, premise?.area]);
  const [whistleCat, setWhistleCat] = useState<string>(whistleCategories[0]);
  const [whistleCorridor, setWhistleCorridor] = useState<string>(premise?.area ?? "Alimosho Canal Axis");
  const [exifStrippedPhoto, setExifStrippedPhoto] = useState(true);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const mediaUrls = useRef(new Set<string>());
  const releaseEvidence = (item: Evidence) => {
    if (mediaUrls.current.delete(item.url)) URL.revokeObjectURL(item.url);
  };
  const mediaUndo = useMediaUndo<Evidence>(releaseEvidence);
  useEffect(() => {
    const urls = mediaUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [capturing, setCapturing] = useState<"photo" | "video" | null>(null);
  const [retakeUrl, setRetakeUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!capturing) return;
    // Camera closed without a file: clear the waiting state when the page regains focus.
    const onFocus = () => window.setTimeout(() => setCapturing(null), 600);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [capturing]);
  const [liveOpen, setLiveOpen] = useState(false);
  const openCapture = (kind: "photo" | "video", replace: string | null = null) => {
    setRetakeUrl(replace);
    if (kind === "video") {
      setLiveOpen(true);
      return;
    }
    setCapturing(kind);
    photoInputRef.current?.click();
  };
  const addEvidence = (files: FileList | null, kind: "photo" | "video") => addFile(files?.[0], kind);
  const addFile = (file: File | undefined, kind: "photo" | "video") => {
    setCapturing(null);
    if (!file) return;
    if (!retakeUrl && evidence.length + mediaUndo.pending.length >= 3) return;
    const next = { name: file.name, kind, url: URL.createObjectURL(file) };
    mediaUrls.current.add(next.url);
    const replace = retakeUrl;
    setRetakeUrl(null);
    setEvidence((prev) => {
      if (replace) {
        const old = prev.find((e) => e.url === replace);
        if (old) releaseEvidence(old);
        return prev.map((e) => (e.url === replace ? next : e));
      }
      return prev.length >= 3 ? prev : [...prev, next];
    });
  };
  const removeEvidence = (url: string) => {
    const index = evidence.findIndex((item) => item.url === url);
    const item = evidence[index];
    if (!item) return;
    mediaUndo.remove(item, index);
    setEvidence((prev) => prev.filter((e) => e.url !== url));
  };

  const descId = useId();
  const catId = useId();
  const titleId = useId();
  const bodyId = useId();
  const wCatId = useId();
  const wLocId = useId();

  const tips = model.whistleblowerTickets ?? [];

  const runTextDraft = async () => {
    setBusy(true);
    setErr(null);
    try {
      const lower = text.toLowerCase();
      const isDump = /(dump|gutter|drain|canal|burn|refuse|illegal)/.test(lower);
      setDraft({
        category: isDump ? "Illegal dumping" : "Other",
        urgency: isDump ? "high" : "medium",
        sendTo: isDump ? ["lawma"] : ["partner"],
        title: isDump ? "Illegal dumping report" : "Resident service report",
        report: text.trim(),
      });
    } catch {
      setErr("Couldn't reach the assistant. Check your connection.");
    }
    setBusy(false);
  };

  const toggle = (who: "partner" | "lawma") =>
    draft &&
    setDraft({
      ...draft,
      sendTo: draft.sendTo.includes(who) ? draft.sendTo.filter((x) => x !== who) : [...draft.sendTo, who],
    });

  if (sent) {
    return (
      <Phone>
        <div className="flex flex-col items-center py-10 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-[#248a3d]/15 text-[#17682c] animate-in zoom-in duration-300">
            <Check className="size-8" strokeWidth={2.5} />
          </div>
          <h1 className="mt-5 text-[28px] font-bold tracking-[-0.025em] text-foreground">{tr("Report saved")}</h1>
          <p className="mt-2 max-w-[280px] text-[15px] text-muted-foreground">{tr("Case")}{" "}<span className="font-semibold text-foreground">{sent}</span>{" "}{tr("has been recorded on this device.")}</p>
          <Link to="/you" className="mt-8 block w-full">
            <IosButton tone="primary">{tr("View my cases")}</IosButton>
          </Link>
        </div>
      </Phone>
    );
  }

  return (
    <Phone>
      <PageTitle
        title={tr("Report an issue")}
        sub={tr("Snap it, speak it, or type it.")}
      />

      <div className="space-y-6">
        <div className="space-y-1">
          <p role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", draftSaved ? "bg-success" : "bg-ember")} />
            {localize(draftSaved ? online ? "Offline-ready draft · Saved on this device" : "Offline · Draft saved on this device" : "Draft stays open · Device storage unavailable")}
          </p>
          {!online && <p className="text-[12px] text-muted-foreground">{tr("Text drafting still works. Voice typing may need a connection.")}</p>}
        </div>
        <IosSegmentedControl
          label={tr("Reporting method")}
          options={modeOptions}
          value={mode}
          onChange={(next) => setMode(next)}
        />

        {mode !== "whistle" && (
          <IosSection header={tr("Show us the spot")} footer={tr("{0}/3 attached. Clips stay here until you leave this page.", evidence.length)}>
            <ul className="grid gap-1.5 px-4 pt-4 text-[13px] text-muted-foreground">
              <li>{tr("• Stand back so the whole pile is in view")}</li>
              <li>{tr("• Include a landmark: gate, sign or pole")}</li>
              <li>{tr("• Video: 10–15 seconds, slow pan")}</li>
            </ul>
            <div className="grid grid-cols-2 gap-3 p-4">
              {(["photo", "video"] as const).map((kind) => {
                const busy = capturing === kind && !retakeUrl;
                const full = evidence.length + mediaUndo.pending.length >= 3;
                const Icon = kind === "photo" ? Camera : Video;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={full || capturing !== null}
                    aria-pressed={busy}
                    onClick={() => openCapture(kind)}
                    className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] border text-[15px] font-semibold disabled:opacity-50 ${
                      busy ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground active:bg-muted"
                    }`}
                  >
                    {busy ? (
                      <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
                    ) : (
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    )}
                    {localize(busy ? "Camera open…" : kind === "photo" ? "Photo" : "Live video")}
                  </button>
                );
              })}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  addEvidence(e.target.files, "photo");
                  e.target.value = "";
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  addEvidence(e.target.files, "video");
                  e.target.value = "";
                }}
              />
              <LiveVideoCapture
                open={liveOpen}
                location={[premise?.address, premise?.area].filter(Boolean).join(", ")}
                onClose={() => {
                  setLiveOpen(false);
                  setRetakeUrl(null);
                }}
                onDone={(file) => {
                  setLiveOpen(false);
                  addFile(file, "video");
                }}
                onFallback={() => {
                  setLiveOpen(false);
                  videoInputRef.current?.click();
                }}
              />
            </div>
            {evidence.length > 0 && (
              <div className="flex gap-3 overflow-x-auto px-4 pb-4">
                {evidence.map((item, i) => (
                  <div key={item.url} className="w-24 shrink-0">
                    <div className="relative">
                      {item.kind === "photo" ? (
                        <img src={item.url} alt={tr("Photo {0}", i + 1)} className="size-24 rounded-[9px] border border-border object-cover" />
                      ) : (
                        <video src={item.url} className="size-24 rounded-[9px] border border-border object-cover" muted playsInline controls />
                      )}
                      <span className="absolute left-1 top-1 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary-foreground">
                        {localize(item.kind)}
                      </span>
                      {capturing && retakeUrl === item.url && (
                        <span className="absolute inset-0 grid place-items-center rounded-[9px] bg-ink/60 text-[12px] font-semibold text-primary-foreground">{tr("Retaking…")}</span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      <Button
                        variant="secondary"
                        disabled={capturing !== null}
                        onClick={() => openCapture(item.kind, item.url)}
                        aria-label={tr("Retake {0} {1}", item.kind, i + 1)}
                        className="min-h-[32px] rounded-[8px] bg-muted text-[12px] font-semibold text-foreground disabled:opacity-50"
                      >{tr("Retake")}</Button>
                      <Button
                        variant="secondary"
                        onClick={() => removeEvidence(item.url)}
                        aria-label={tr("Remove {0} {1}", item.kind, i + 1)}
                        className="grid min-h-[32px] place-items-center rounded-[8px] bg-muted text-destructive"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mediaUndo.pending.length > 0 && (
              <div className="px-4 pb-4">
                <MediaUndoBanner label={localize(mediaUndo.pending.length === 1 ? `${mediaUndo.pending[0]?.item.kind === "video" ? "Video" : "Photo"} removed` : `${mediaUndo.pending.length} attachments removed`)} onUndo={() => {
                  const removed = mediaUndo.restore();
                  setEvidence((prev) => restoreMedia(prev, removed));
                }} />
                <p className="mt-1 text-[11px] text-muted-foreground">{tr("Undo available for 10 seconds.")}</p>
              </div>
            )}
          </IosSection>
        )}

        {mode === "whistle" ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-ink p-4 text-primary-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-200">
                  <EyeOff className="size-3.5" aria-hidden="true" />{tr("Zero-Knowledge Anti-Retaliation Vault")}</span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold">{tr("₦10,000 Bounty")}</span>
              </div>
              <p className="mt-2 text-[14px] leading-snug text-white/90">{tr("Your phone number is one-way hashed (")}<code className="font-mono text-emerald-200">{tr("zk-msisdn-*")}</code>{tr(") and photo EXIF/IMEI metadata is scrubbed locally before LAWMA I&E receives it.")}</p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!whistleCorridor.trim()) return;
                submitWhistleblower(whistleCat, whistleCorridor.trim());
              }}
            >
              <IosSection header={tr("Sealed whistleblower evidence")}>
                <div className="px-4 py-3">
                  <label htmlFor={wCatId} className="block text-[12px] font-semibold text-muted-foreground">{tr("Offence category")}</label>
                  <select
                    id={wCatId}
                    value={whistleCat}
                    onChange={(e) => setWhistleCat(e.target.value)}
                    className="mt-1 w-full bg-transparent text-[16px] font-medium text-foreground focus:outline-none"
                  >
                    {whistleCategories.map((c) => (
                      <option key={c} value={c}>
                        {localize(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="px-4 py-3">
                  <label htmlFor={wLocId} className="block text-[12px] font-semibold text-muted-foreground">{tr("Locus / street / canal coordinates")}</label>
                  <input
                    id={wLocId}
                    type="text"
                    required
                    value={whistleCorridor}
                    onChange={(e) => setWhistleCorridor(e.target.value)}
                    placeholder={tr("e.g. Egbeda Canal Culvert 4")}
                    className="mt-1 w-full bg-transparent text-[16px] text-foreground focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{tr("EXIF & Device ID Scrubbed")}</p>
                    <p className="text-[12px] text-muted-foreground">{tr("Silent shutter · No reporter GPS stamp")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExifStrippedPhoto((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold",
                      exifStrippedPhoto ? "bg-primary text-white" : "bg-[#e5e5ea] text-foreground",
                    )}
                  >
                    <Camera className="size-3.5" aria-hidden="true" />
                    {localize(exifStrippedPhoto ? "Verified Clean" : "Attach Photo")}
                  </button>
                </div>
              </IosSection>

              <IosButton type="submit" tone="ember" disabled={!whistleCorridor.trim()}>
                <ShieldAlert className="mr-1.5 size-4" aria-hidden="true" />{tr("Seal & Submit Anonymous Tip")}</IosButton>
            </form>

            {tips.length > 0 && (
              <IosSection header={tr("Blind bounty receipts")} footer={tr("Identity stays cryptographically decoupled from bounty payout.")}>
                {tips.map((t) => (
                  <IosRow
                    key={t.id}
                    icon={<Award className="size-4" />}
                    iconTone="forest"
                    title={tr("{0} · {1}", t.id, t.category)}
                    subtitle={tr("{0} · {1} · EXIF Clean", t.corridor, t.hashedMsisdn)}
                    detail="₦10,000"
                    trailing={<IosBadge>{t.bountyStatus === "Blind Escrow Locked" ? "Active" : "Paid"}</IosBadge>}
                  />
                ))}
              </IosSection>
            )}
          </div>
        ) : mode === "voice" && draftLoaded ? (
          <LocalVoiceAgent
            initialTranscript={voiceTranscript}
            onTranscriptChange={setVoiceTranscript}
            address={premise?.address}
            area={premise?.area}
            onDraftReady={(voiceDraft, rawText) => {
              setText(rawText);
              setVoiceReview(voiceDraft);
              setDraft({
                category: voiceDraft.category,
                urgency: voiceDraft.urgency,
                sendTo: voiceDraft.sendTo,
                title: voiceDraft.title,
                report: voiceDraft.report,
              });
            }}
          />
        ) : (
          <IosSection header={tr("What happened?")}>
            <div className="px-4 py-3">
              <label htmlFor={descId} className="sr-only">{tr("Describe the waste issue")}</label>
              <textarea
                id={descId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={tr("e.g. Someone has been dumping refuse beside the canal at the end of our street for 3 days…")}
                className="w-full resize-none bg-transparent text-[16px] leading-[22px] text-foreground placeholder:text-[#3c3c43]/40 focus:outline-none"
              />
            </div>
            {err && (
              <p role="alert" className="px-4 py-2 text-[14px] font-medium text-[#c92117]">
                {localize(err)}
              </p>
            )}
            <div className="p-4">
              <IosButton
                tone="primary"
                disabled={busy || text.trim().length < 8}
                onClick={runTextDraft}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {localize(busy ? "Drafting report…" : draft ? "Draft again" : "Draft my report")}
              </IosButton>
            </div>
          </IosSection>
        )}

        {draft && (
          <>
            {voiceReview && (
              <IosSection header={tr("What you said")}>
                <div className="space-y-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{tr("Your exact words (")}{voiceReview.dialectLabel})</p>
                    <p className="whitespace-pre-wrap text-[15px] text-foreground">“{voiceReview.originalTranscript}”</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">{tr("English summary sent to the team")}</p>
                    <p className="text-[15px] text-foreground">{voiceReview.translatedSummary}</p>
                  </div>
                  {voiceReview.confidence === "low" && (
                    <div role="alert" className="rounded-lg border border-destructive bg-muted p-3 text-[14px] text-foreground">
                      <p className="font-semibold">{tr("We're not sure we understood. Please check the category below.")}</p>
                      {voiceReview.reasons.map((x) => <p key={x}>{localize(x)}</p>)}
                    </div>
                  )}
                </div>
              </IosSection>
            )}
            <IosSection header={tr("Review report details")}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor={catId} className="block text-[13px] font-medium text-muted-foreground">{tr("Category")}</label>
                  <select
                    id={catId}
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as ReportDraft["category"] })}
                    className="mt-1 w-full bg-transparent text-[16px] font-semibold text-foreground focus:outline-none"
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {localize(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <IosBadge>{draft.urgency === "high" ? "Urgent" : draft.urgency === "medium" ? "Medium" : "Low"}</IosBadge>
              </div>

              <div className="px-4 py-3">
                <label htmlFor={locId} className="block text-[13px] font-medium text-muted-foreground">{tr("Location")}</label>
                <input
                  id={locId}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={tr("Street, landmark or area")}
                  className="mt-1 w-full bg-transparent text-[16px] font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="px-4 py-3">
                <label htmlFor={titleId} className="block text-[13px] font-medium text-muted-foreground">{tr("Subject")}</label>
                <input
                  id={titleId}
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="mt-1 w-full bg-transparent text-[16px] font-semibold text-foreground focus:outline-none"
                />
              </div>

              <div className="px-4 py-3">
                <label htmlFor={bodyId} className="block text-[13px] font-medium text-muted-foreground">{tr("Report statement")}</label>
                <textarea
                  id={bodyId}
                  value={draft.report}
                  onChange={(e) => setDraft({ ...draft, report: e.target.value })}
                  rows={5}
                  className="mt-1 w-full resize-none bg-transparent text-[15px] leading-[21px] text-foreground focus:outline-none"
                />
              </div>
            </IosSection>

            <IosSection header={tr("Send to")}>
              <IosRow
                onClick={() => toggle("partner")}
                leading={<PartnerLogo partnerId={partner?.id} name={partner?.name} size="sm" />}
                title={localize(partner?.name ?? "My collection partner")}
                subtitle={tr("Handles missed pickups and bin issues")}
                selected={draft.sendTo.includes("partner")}
              />
              <IosRow
                onClick={() => toggle("lawma")}
                icon={<Landmark className="size-4" />}
                iconTone="blue"
                title={tr("LAWMA Compliance")}
                subtitle={tr("Handles illegal dumping and oversight")}
                selected={draft.sendTo.includes("lawma")}
              />
            </IosSection>

            <label className="flex items-start gap-3 px-1 text-[14px] text-foreground">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 size-5 accent-primary"
              />{tr("I have checked the category, location, summary and who it goes to. Send it as shown.")}</label>
            <IosButton
              tone="ember"
              disabled={!confirmed || !location.trim() || !draft.sendTo.length || draft.report.trim().length < 5}
              onClick={() => {
                if (!confirmed || !location.trim()) return;
                const evidenceNote = evidence.length
                  ? `\n\nEvidence attached: ${evidence.map((e) => `${e.kind} (${e.name})`).join(", ")}`
                  : "";
                setSent(
                  report(draft.category, `Location: ${location.trim()}\n\n${draft.report.trim()}${evidenceNote}`, draft.sendTo, {
                    title: draft.title,
                    urgency: draft.urgency,
                    original: voiceReview?.originalTranscript ?? text.trim(),
                  }),
                );
                evidence.forEach(releaseEvidence);
                mediaUndo.clear();
                try { localStorage.removeItem(REPORT_DRAFT_KEY); } catch { /* Device storage unavailable. */ }
                setEvidence([]);
              }}
            >{tr("Confirm & send report")}</IosButton>
          </>
        )}
      </div>
    </Phone>
  );
}
