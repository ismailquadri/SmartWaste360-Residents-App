import { useLanguage } from "@/lib/language";
import { createFileRoute } from "@tanstack/react-router";
import { Headphones, MessageSquarePlus, Pencil, RotateCcw } from "lucide-react";
import { FluxioAlert as AlertTriangle } from "@/components/icons/FluxioIcons";
import { useEffect, useId, useState } from "react";
import { LinkStatus, PageTitle, Phone } from "@/components/app";
import { PartnerLogo } from "@/components/PartnerLogo";
import {
  IosActionSheet,
  IosBadge,
  IosButton,
  IosEmpty,
  IosRow,
  IosSection,
  IosSheet,
} from "@/components/ios";
import { money, partners } from "@/lib/customer-model";
import type { AppName } from "@/lib/hub-contract";
import { meta } from "@/lib/meta";
import { useStore } from "@/lib/store";
import { LanguageSelector } from "@/components/LanguageSelector";

export const Route = createFileRoute("/you")({
  head: () => meta("You", "Your resident profile, support cases and collection partner."),
  component: You,
});

const types: { label: string; to: AppName[] }[] = [
  { label: "Missed pickup", to: ["partner", "lawma"] },
  { label: "Billing question", to: ["partner"] },
  { label: "Illegal dumping nearby", to: ["lawma"] },
  { label: "Complaint about my partner", to: ["lawma"] },
];

function You() {
  const { t: tr, localize } = useLanguage();
  const { model, partner, premise, report, requestProviderChange, reset } = useStore();
  const [type, setType] = useState(types[0]!);
  const [detail, setDetail] = useState("");
  const [sent, setSent] = useState("");
  const [change, setChange] = useState("");
  const [changeErr, setChangeErr] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const noteId = useId();
  const pending = partners.find((p) => p.id === model.pendingPartnerId);

  const initials = model.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "R";

  return (
    <Phone>
      <PageTitle title={tr("You")} />

      <div className="space-y-6">
        {/* Apple Account Profile Card */}
        <section className="ios-group p-4" aria-label={tr("Resident profile")}>
          <div className="flex items-center gap-3.5">
            <div
              aria-hidden="true"
              className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-[19px] font-bold text-white shadow-sm"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[19px] font-semibold tracking-[-0.02em] text-foreground">
                  {model.name}
                </p>
                <LinkStatus />
              </div>
              <p className="mt-0.5 truncate text-[14px] text-muted-foreground">
                {premise?.address}, {premise?.area}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {model.phone}{" "}{tr("· ID")}{" "}{model.customerId}
              </p>
            </div>
          </div>
        </section>

        <ResidentEditor />
        <IosSection header={tr("Language settings")}><LanguageSelector full /></IosSection>

        <IosSection header={tr("Environmental reporting")}>
          <IosRow
            to="/report"
            icon={<AlertTriangle className="size-4" />}
            iconTone="ember"
            title={tr("Report an issue")}
            subtitle={tr("Draft and send a problem in seconds")}
            disclosure
          />
        </IosSection>

        <IosSection
          header={tr("Quick help")}
          footer={tr("Routed directly to {0}.", type.to.map((target) => (target === "lawma" ? "LAWMA" : tr("your partner"))).join(tr(" and ")))}
        >
          {types.map((t) => (
            <IosRow
              key={t.label}
              onClick={() => setType(t)}
              icon={<Headphones className="size-4" />}
              iconTone={type.label === t.label ? "forest" : "slate"}
              title={localize(t.label)}
              selected={type.label === t.label}
            />
          ))}

          <div className="px-4 py-3">
            <label htmlFor={noteId} className="block text-[13px] font-medium text-muted-foreground">{tr("Details")}</label>
            <textarea
              id={noteId}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder={tr("Tell us what happened…")}
              className="mt-1.5 w-full resize-none bg-transparent text-[16px] leading-[22px] text-foreground placeholder:text-[#3c3c43]/40 focus:outline-none"
            />
          </div>

          <div className="p-4">
            <IosButton
              tone="primary"
              disabled={detail.trim().length < 3}
              onClick={() => {
                setSent(report(type.label, detail.trim(), type.to));
                setDetail("");
              }}
            >{tr("Send case")}</IosButton>
            {sent && (
              <p role="status" className="mt-2.5 text-center text-[13px] font-medium text-[#17682c]">{tr("Case")}{" "}{sent}{" "}{tr("sent.")}</p>
            )}
          </div>
        </IosSection>

        <CaseTimeline />

        <IosSection header={tr("Statutory Ward PSP (Sec. 71 EMPL 2017)")} footer={tr("Ward franchises are assigned by Lagos State Law. Transfers require LAWMA Compliance review for repeated SLA breaches.")}>
          <IosRow
            leading={<PartnerLogo partnerId={partner?.id} name={partner?.name} size="md" />}
            title={localize(partner?.name ?? "None selected")}
            subtitle={localize(pending ? `SLA Transfer to ${pending.name} awaiting LAWMA review` : partner?.area)}
            detail={localize(partner ? money(partner.charge) : undefined)}
            trailing={pending ? <IosBadge>Pending</IosBadge> : <IosBadge>Statutory</IosBadge>}
          />

          {!pending && (
            <IosRow
              onClick={() => {
                setChangeErr(null);
                setShowTransfer(true);
              }}
              title={tr("Petition Ward PSP SLA Transfer")}
              subtitle={tr("Escalate uncollected sweeps to LAWMA Compliance")}
              disclosure
            />
          )}
        </IosSection>

        <IosSection footer={tr("Clear this device’s demo data and return to welcome.")}>
          <IosButton
            tone="destructive"
            onClick={() => setConfirmReset(true)}
            className="min-h-12"
          >
            <RotateCcw className="size-4" aria-hidden="true" />{tr("Reset demo")}</IosButton>
        </IosSection>
      </div>

      <IosSheet
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        title={tr("Switch partner")}
      >
        <div className="space-y-4 pt-1">
          <IosSection header={tr("Available PSP partners")}>
            {partners
              .filter((p) => p.id !== model.partnerId)
              .map((p) => (
                <IosRow
                  key={p.id}
                  onClick={() => {
                    setChange(p.id);
                    setChangeErr(null);
                  }}
                  leading={<PartnerLogo partnerId={p.id} name={p.name} size="md" />}
                  title={localize(p.name)}
                  subtitle={tr("{0} · {1}", p.area, p.rating)}
                  detail={localize(money(p.charge))}
                  selected={change === p.id}
                />
              ))}
          </IosSection>

          {changeErr && (
            <p role="alert" className="px-2 text-[13px] font-medium text-[#c92117]">
              {localize(changeErr)}
            </p>
          )}

          <IosButton
            tone="primary"
            disabled={!change}
            onClick={() => {
              const res = requestProviderChange(change);
              setChangeErr(res);
              if (!res) {
                setShowTransfer(false);
                setChange("");
              }
            }}
          >{tr("Ask LAWMA to change partner")}</IosButton>
        </div>
      </IosSheet>

      <IosActionSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={tr("Delete your demo data?")}
        message={tr("Your demo profile, room payments, wallet history and saved report draft will be deleted from this device. This cannot be undone.")}
        confirmLabel={tr("Delete demo data")}
        cancelLabel={tr("Keep my data")}
        onConfirm={reset}
        destructive
      />
    </Phone>
  );
}

const PHONE_RE = /^(?:0|\+?234)[789][01]\d{8}$/;
const ADDR_KEY = "lawma-address-correction";

function ResidentEditor() {
  const { t: tr, localize } = useLanguage();
  const { model, partner, premise, start, report, requestProviderChange } = useStore();
  const id = useId();
  const baseAddress = [premise?.address, premise?.area].filter(Boolean).join(", ");
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  useEffect(() => setSavedAddress(localStorage.getItem(ADDR_KEY)), []);
  const current = { address: savedAddress ?? baseAddress, phone: model.phone, provider: model.pendingPartnerId || partner?.id || "" };
  const [draft, setDraft] = useState<typeof current | null>(null);
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const name = (pid: string) => partners.find((x) => x.id === pid)?.name ?? "Not assigned";
  const changes = draft
    ? ([
        ["Address", current.address, draft.address.trim()],
        ["Phone number", current.phone, draft.phone.replace(/\s/g, "")],
        ["Collector (PSP)", name(current.provider), name(draft.provider)],
      ] as const).filter(([, a, b]) => a !== b)
    : [];
  const open = () => { setDraft({ ...current }); setStep("edit"); setErr(null); };
  const field = "mt-1 w-full bg-transparent text-[16px] text-foreground focus:outline-none";
  return (
    <>
      <IosSection header={tr("My details")} footer={tr("Tap to correct. You'll review every change before it's saved.")}>
        <IosRow icon={<Pencil className="size-4" />} iconTone="slate" title={tr("Address")} subtitle={current.address || tr("Not set")} onClick={open} disclosure />
        <IosRow icon={<Pencil className="size-4" />} iconTone="slate" title={tr("Phone number")} subtitle={current.phone || tr("Not set")} onClick={open} disclosure />
        <IosRow icon={<Pencil className="size-4" />} iconTone="slate" title={tr("Assigned collector")} subtitle={tr("{0}{1}", name(current.provider), model.pendingPartnerId ? tr(" (change waiting for LAWMA)") : "")} onClick={open} disclosure />
      </IosSection>
      {done && <p role="status" className="-mt-4 px-4 text-[13px] font-medium text-foreground">{localize(done)}</p>}
      <IosSheet open={draft !== null} onClose={() => setDraft(null)} title={localize(step === "review" ? "Check your changes" : "Edit my details")}>
        {draft && step === "edit" && (
          <form
            className="space-y-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.address.trim().length < 8) return setErr("Please enter your full address (street and area).");
              if (!PHONE_RE.test(draft.phone.replace(/\s/g, ""))) return setErr("Enter a Nigerian mobile number, like 08031234567 or +2348031234567.");
              if (!partners.some((x) => x.id === draft.provider)) return setErr("Choose a collector.");
              if (changes.length === 0) return setErr("Nothing has changed yet.");
              setErr(null); setStep("review");
            }}
          >
            <div><label htmlFor={`${id}-a`} className="text-[13px] font-medium text-muted-foreground">{tr("Address")}</label>
              <input id={`${id}-a`} className={field} value={draft.address} autoComplete="street-address" onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            <div><label htmlFor={`${id}-p`} className="text-[13px] font-medium text-muted-foreground">{tr("Phone number")}</label>
              <input id={`${id}-p`} type="tel" className={field} value={draft.phone} autoComplete="tel" onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
            <div><label htmlFor={`${id}-c`} className="text-[13px] font-medium text-muted-foreground">{tr("Assigned collector (PSP)")}</label>
              <select id={`${id}-c`} className={field} value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })}>
                {partners.map((x) => <option key={x.id} value={x.id}>{localize(x.name)} · {localize(x.area)}</option>)}
              </select>
              <p className="mt-1 text-[12px] text-muted-foreground">{tr("Your collector is set by law for your area. A change is a request that LAWMA must approve.")}</p></div>
            {err && <p role="alert" className="text-[13px] font-medium text-destructive">{localize(err)}</p>}
            <IosButton type="submit" tone="primary">{tr("Review changes")}</IosButton>
          </form>
        )}
        {draft && step === "review" && (
          <div className="space-y-4 pt-1">
            <dl className="divide-y divide-border rounded-xl border border-border bg-card">
              {changes.map(([k, a, b]) => (
                <div key={k} className="px-4 py-3 text-[14px]">
                  <dt className="font-semibold text-foreground">{localize(k)}</dt>
                  <dd className="text-muted-foreground"><s>{a || "Not set"}</s> → <span className="font-semibold text-foreground">{localize(b)}</span></dd>
                </div>
              ))}
            </dl>
            {changes.some(([k]) => k === "Collector (PSP)") && (
              <p className="text-[13px] text-muted-foreground">{tr("The collector change will be sent to LAWMA for approval. Your current collector keeps serving you until then.")}</p>
            )}
            {err && <p role="alert" className="text-[13px] font-medium text-destructive">{localize(err)}</p>}
            <IosButton
              tone="primary"
              onClick={() => {
                for (const [k, a, b] of changes) {
                  if (k === "Phone number") start(model.name, b);
                  if (k === "Address") {
                    localStorage.setItem(ADDR_KEY, b); setSavedAddress(b);
                    report("Address correction", `Please update my address from "${a}" to "${b}".`, ["lawma", "partner"]);
                  }
                  if (k === "Collector (PSP)") {
                    const res = requestProviderChange(draft.provider);
                    if (res) { setErr(res); return; }
                  }
                }
                setDraft(null);
                setDone(`Saved ${changes.length} change${changes.length === 1 ? "" : "s"}.`);
              }}
            >{tr("Save changes")}</IosButton>
            <IosButton tone="gray" onClick={() => setStep("edit")}>{tr("Back to editing")}</IosButton>
          </div>
        )}
      </IosSheet>
    </>
  );
}

const SLA_HOURS: Record<string, number> = { "Missed pickup": 24, "Overflowing bin": 24, "Billing question": 72, "Address correction": 72 };
const STEPS = ["Received", "Assigned", "In progress", "Resolved"] as const;
const OPENED_KEY = "lawma-case-opened";

function CaseTimeline() {
  const { t: tr, localize } = useLanguage();
  const { model, partner, report } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [disputed, setDisputed] = useState<Record<string, string>>({});
  const rid = useId();

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    let map: Record<string, number> = {};
    try { map = JSON.parse(localStorage.getItem(OPENED_KEY) ?? "{}") as Record<string, number>; } catch { /* ignore */ }
    let changed = false;
    for (const i of model.issues) if (!map[i.id]) { map[i.id] = Date.now(); changed = true; }
    if (changed) localStorage.setItem(OPENED_KEY, JSON.stringify(map));
    setOpened(map);
  }, [model.issues]);

  return (
    <section className="space-y-2" aria-label={tr("My cases")}>
      <h2 className="eyebrow px-4">{tr("My cases")}</h2>
      {model.issues.length === 0 ? (
        <IosEmpty icon={<MessageSquarePlus className="size-5" />} title={tr("No open cases")}>{tr("Support questions and issue reports will appear here.")}</IosEmpty>
      ) : (
        <div className="space-y-3">
          {model.issues.map((i) => {
            const isDisputed = Boolean(disputed[i.id]);
            const stepIdx = isDisputed ? 1 : i.status === "Resolved" ? 3 : i.status === "In review" ? 2 : i.from ? 1 : 0;
            const team = i.from === "lawma" ? "LAWMA Compliance" : i.from === "partner" ? `${partner?.name ?? "Your collector"} crew` : "Waiting to be assigned";
            const sla = SLA_HOURS[i.type] ?? 48;
            const start = opened[i.id];
            const left = start ? Math.round((start + sla * 3_600_000 - now) / 3_600_000) : null;
            const repeats = model.issues.filter((x) => x.type === i.type).length;
            const expanded = openId === i.id;
            return (
              <article key={i.id} className="ios-card p-4">
                <button type="button" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : i.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[16px] font-semibold text-foreground">{localize(i.type)}</p>
                      <p className="font-mono text-[12px] text-muted-foreground">{localize(i.id)} · {localize(i.time)}</p>
                    </div>
                    <IosBadge>{isDisputed ? "Reopened" : STEPS[stepIdx]}</IosBadge>
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    {localize(stepIdx === 3 && !isDisputed
                      ? "Resolved"
                      : left === null
                        ? `Target: ${sla}h`
                        : left >= 0
                          ? `Due in ${left}h (target ${sla}h)`
                          : `Overdue by ${-left}h (target ${sla}h)`)}
                    {localize(" · ")}{localize(expanded ? "Hide details" : "Show timeline")}
                  </p>
                </button>
                {expanded && (
                  <div className="mt-3 space-y-3">
                    <p className="text-[14px] text-foreground">{i.detail}</p>
                    <p className="text-[13px] text-muted-foreground"><strong className="text-foreground">{tr("Assigned team:")}</strong> {localize(team)}</p>
                    <ol className="ml-2 space-y-2 border-l border-border pl-4">
                      {STEPS.map((st, n) => (
                        <li key={st} aria-current={n === stepIdx ? "step" : undefined} className={n <= stepIdx ? "text-[14px] font-semibold text-foreground" : "text-[14px] text-muted-foreground"}>
                          {localize(n < stepIdx ? "✓ " : n === stepIdx ? "● " : "○ ")}{localize(st)}{localize(n === stepIdx ? " — now" : "")}
                        </li>
                      ))}
                    </ol>
                    {i.reply && (
                      <div className="rounded-lg bg-muted p-3 text-[14px] text-foreground">
                        <span className="font-semibold">{localize(i.from === "lawma" ? "LAWMA" : "Partner")}: </span>{i.reply}
                      </div>
                    )}
                    {i.status === "Resolved" && !isDisputed && (
                      <div className="space-y-2 rounded-lg border border-border p-3">
                        <p className="text-[14px] font-semibold text-foreground">{tr("Proof it was fixed")}</p>
                        <p className="text-[13px] text-muted-foreground">{i.reply ? `Note: ${i.reply}` : "No photo or note was sent with this fix."}</p>
                        <IosButton tone="gray" className="min-h-[44px] text-[14px]" onClick={() => { setDisputeId(i.id); setReason(""); }}>{tr("Not fixed? Dispute this")}</IosButton>
                      </div>
                    )}
                    {isDisputed && <p className="text-[13px] text-foreground">{tr("You reopened this case: “")}{localize(disputed[i.id])}”</p>}
                    <p className="text-[12px] text-muted-foreground">
                      {localize(repeats > 1 ? `This is report ${repeats} of this type from your home. Repeat problems are flagged to LAWMA.` : "First report of this type from your home.")}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <IosSheet open={disputeId !== null} onClose={() => setDisputeId(null)} title={tr("Dispute this fix")}>
        <form
          className="space-y-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!disputeId || reason.trim().length < 10) return;
            const orig = model.issues.find((x) => x.id === disputeId);
            report(`Dispute: ${orig?.type ?? "case"}`, `Case ${disputeId} is not fixed. ${reason.trim()}`, ["lawma"]);
            setDisputed((d) => ({ ...d, [disputeId]: reason.trim() }));
            setDisputeId(null);
          }}
        >
          <label htmlFor={rid} className="block text-[14px] font-medium text-foreground">{tr("What is still wrong?")}</label>
          <textarea id={rid} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-border bg-background p-3 text-[16px] text-foreground" />
          <p className="text-[12px] text-muted-foreground">{tr("This reopens the case and sends a linked dispute to LAWMA.")}</p>
          <IosButton type="submit" tone="destructive" disabled={reason.trim().length < 10}>{tr("Reopen case")}</IosButton>
        </form>
      </IosSheet>
    </section>
  );
}
