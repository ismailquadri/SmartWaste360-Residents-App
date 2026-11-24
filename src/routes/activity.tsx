import { useLanguage } from "@/lib/language";
import { createFileRoute } from "@tanstack/react-router";
import { Recycle } from "lucide-react";
import { FluxioAlert as AlertTriangle, FluxioCalendar as Calendar, FluxioCamera as Camera, FluxioCheckCircle as CheckCircle2, FluxioClock as Clock, FluxioShieldAlert as ShieldAlert, FluxioShieldCheck as ShieldCheck, FluxioTruck as Truck } from "@/components/icons/FluxioIcons";
import { useId, useState } from "react";
import { z } from "zod";
import { PageTitle, Phone } from "@/components/app";
import { PartnerLogo } from "@/components/PartnerLogo";
import { PaymentDemoBadge } from "@/components/PaymentDemoBadge";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosRow,
  IosSection,
} from "@/components/ios";
import { defaultRemediations, money, OPEN_PICKUP } from "@/lib/customer-model";
import { meta } from "@/lib/meta";
import { CIRCULAR_HUBS, CORRIDOR_SCHEDULE_BY_PARTNER, defaultCircularDrops } from "@/lib/resident-ops";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  validateSearch: z.object({ new: z.coerce.number().optional() }),
  head: () => meta("Activity", "Dual-Key remediation verification, corridor truck telemetry, and sweep logs."),
  component: ActivityPage,
});

/** Next date (Lagos time, UTC+1) falling on one of `days` (0=Sun) whose `hour` hasn't passed yet. */
function nextDate(days: readonly number[], hour: number): string {
  const lagos = new Date(Date.now() + 3_600_000);
  for (let i = 0; i <= 7; i += 1) {
    const d = new Date(lagos);
    d.setUTCDate(d.getUTCDate() + i);
    d.setUTCHours(hour, 0, 0, 0);
    if (days.includes(d.getUTCDay()) && d.getTime() > lagos.getTime()) {
      return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);
    }
  }
  return "next week";
}

type ServiceKind = "Statutory" | "Optional" | "Paid";
const schedules: { title: string; kind: ServiceKind; days: number[]; hour: number; step: (date: string) => string }[] = [
  { title: "Bulky item pickup", kind: "Optional", days: [6], hour: 7, step: (d) => `Book below, then put old furniture or large items out by 7am on ${d}.` },
  { title: "Flood-prep extra lift", kind: "Optional", days: [6], hour: 7, step: (d) => `Bag loose waste near drains by 7am on ${d}. Don't go into drains or floodwater.` },
  { title: "Keke feeder recycling", kind: "Optional", days: [2, 4, 6], hour: 8, step: (d) => `Have sorted bottles, cans and cardboard ready by 8am on ${d}. Earns wallet credit.` },
  { title: "On-demand extra pickup", kind: "Paid", days: [2, 5], hour: 6, step: (d) => `Book and wait for your collector to accept. Earliest: ${d}, 6–11am.` },
];

const DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/** Collection days for a partner, read from its published schedule ("Mon & Thu · ..."); "Daily" = every day. */
function weeklyDays(partnerId: string | undefined): number[] {
  const label = (partnerId && CORRIDOR_SCHEDULE_BY_PARTNER[partnerId]) || "Tue & Fri";
  if (/daily/i.test(label)) return [0, 1, 2, 3, 4, 5, 6];
  const found = DAY.flatMap((d, i) => (new RegExp(`\\b${d}`, "i").test(label) ? [i] : []));
  return found.length ? found : [2, 5];
}

function windowsFor() {
  return [
    `On-demand extra pickup · ${nextDate([2], 6)} · 06:00–11:00`,
    `On-demand extra pickup · ${nextDate([5], 6)} · 06:00–11:00`,
    `Bulky / flood-prep extra lift · ${nextDate([6], 7)} · 07:00`,
  ];
}

function ActivityPage() {
  const { t: tr, localize } = useLanguage();
  const { model, partner, requestPickup, cancelPickup, resolveRemediation } = useStore();
  const windows = windowsFor();
  const [win, setWin] = useState<string>(windows[0] ?? "");
  const [reviewing, setReviewing] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState("");
  const [counterPhoto, setCounterPhoto] = useState(true);
  const [disputeErr, setDisputeErr] = useState<string | null>(null);
  const noteInputId = useId();
  const noteErrId = useId();

  const open = model.pickups.find((p) => OPEN_PICKUP.includes(p.status));
  const sweep = model.corridorSweep;
  const remediations = model.remediations ?? defaultRemediations();

  return (
    <Phone>
      <PageTitle title={tr("Pickups")} sub={tr("Your schedule and clearance checks.")} />

      <div className="space-y-6">
        <IosSection
          header={tr("Your collection schedule")}
          footer={tr("Weekly collection is required and already paid for in your bill. Everything else is optional — you only pay for what you book.")}
        >
          {[
            {
              title: "Weekly household collection",
              kind: "Statutory" as ServiceKind,
              days: weeklyDays(partner?.id),
              hour: 6,
              step: (d: string) => `Put your bags out by 6am on ${d}. Already included in your monthly bill.`,
            },
            ...schedules,
          ].map((sc) => {
            const date = nextDate(sc.days, sc.hour);
            return (
              <IosRow
                key={sc.title}
                icon={sc.kind === "Statutory" ? <Calendar className="size-4" /> : sc.kind === "Paid" ? <Clock className="size-4" /> : <Recycle className="size-4" />}
                iconTone={sc.kind === "Statutory" ? "forest" : sc.kind === "Paid" ? "ember" : "slate"}
                title={localize(sc.title)}
                subtitle={localize(sc.step(date))}
                trailing={
                  <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold", sc.kind === "Statutory" ? "bg-success/15 text-success" : sc.kind === "Paid" ? "bg-ember/15 text-accent-foreground" : "bg-muted text-muted-foreground")}>
                    {localize(sc.kind === "Statutory" ? "Statutory · weekly" : sc.kind === "Paid" ? `Paid${partner ? ` · ${money(partner.charge)}` : ""}` : sc.title.startsWith("Keke") ? "Feeder · optional" : "Optional")}
                  </span>
                }
              />
            );
          })}
        </IosSection>

        <section className="space-y-2">
          <h2 className="eyebrow px-4">{tr("Clean-up checks")}</h2>
          <div className="space-y-3">
            {remediations.map((rem) => {
              const awaiting = rem.status === "Awaiting Citizen Key";
              const frozen = rem.status === "Disputed · Escrow Frozen";
              return (
                <div key={rem.id} className="ios-card overflow-hidden p-0">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", awaiting ? "bg-ember/10 text-ember" : frozen ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                        {frozen ? <ShieldAlert className="size-3.5" aria-hidden="true" /> : <ShieldCheck className="size-3.5" aria-hidden="true" />}
                        {localize(awaiting ? "Your check needed" : frozen ? "Disputed" : "Closed")}
                      </span>
                      <span className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{localize(rem.id)}</span>
                    </div>
                    <p className="mt-2.5 font-display text-[17px] font-bold leading-snug text-foreground">{localize(rem.title)}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">{localize(rem.afterPhotoSummary)}</p>
                  </div>
                  <dl className="grid grid-cols-3 border-y border-border text-center">
                    {[["Held", money(rem.escrowAmountNgn)], ["Ticket", rem.ticketRef], ["Sent", rem.submittedAt]].map(([k, v], i) => (
                      <div key={k} className={cn("min-w-0 px-2 py-2.5", i > 0 && "border-l border-border")}>
                        <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{localize(k)}</dt>
                        <dd className="mt-0.5 truncate text-[13px] font-semibold text-foreground">{localize(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="px-4 pb-4">
                  {rem.citizenNote && (
                    <p className="mt-3 text-[12px] font-medium text-foreground">{tr("Your note:")}{" "}{localize(rem.citizenNote)}
                    </p>
                  )}
                  {awaiting && disputingId !== rem.id && <p className="mt-3 text-[13px] text-foreground">{tr("Is the spot clean now? The crew is paid only when you confirm.")}</p>}

                  {awaiting && disputingId !== rem.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <IosButton
                        tone="ember"
                        className="min-h-12 rounded-[10px] text-[14px] font-semibold"
                        onClick={() => {
                          resolveRemediation(rem.id, "confirm");
                          setDisputeErr(null);
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 size-4 shrink-0" aria-hidden="true" />{tr("It's clean")}</IosButton>
                      <IosButton
                        tone="gray"
                        className="min-h-12 rounded-[10px] text-[14px] font-semibold"
                        onClick={() => {
                          setDisputingId(rem.id);
                          setDisputeErr(null);
                        }}
                      >
                        <AlertTriangle className="mr-1.5 size-4 shrink-0 text-destructive" aria-hidden="true" />{tr("Still dirty")}</IosButton>
                    </div>
                  )}

                  {awaiting && disputingId === rem.id && (
                    <form
                      className="mt-3 space-y-2.5 rounded-[12px] border border-[#d92d20]/25 bg-[#fef3f2] p-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const res = resolveRemediation(rem.id, "dispute", disputeNote, counterPhoto);
                        if (res) {
                          setDisputeErr(res);
                        } else {
                          setDisputingId(null);
                          setDisputeNote("");
                          setDisputeErr(null);
                        }
                      }}
                    >
                      <label htmlFor={noteInputId} className="block text-[12px] font-semibold text-[#912018]">{tr("Counter-evidence to freeze")}{" "}{localize(money(rem.escrowAmountNgn))}{" "}{tr("PSP escrow")}</label>
                      <textarea
                        id={noteInputId}
                        rows={2}
                        value={disputeNote}
                        onChange={(e) => {
                          setDisputeNote(e.target.value);
                          if (disputeErr) setDisputeErr(null);
                        }}
                        aria-invalid={disputeErr ? "true" : "false"}
                        aria-describedby={disputeErr ? noteErrId : undefined}
                        placeholder={tr("Describe what remains uncollected...")}
                        className="w-full rounded-[10px] border border-[#d92d20]/30 bg-white px-3 py-2 text-[14px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]"
                      />
                      <button
                        type="button"
                        onClick={() => setCounterPhoto((v) => !v)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                          counterPhoto ? "bg-primary text-white" : "bg-white text-foreground ring-1 ring-black/10",
                        )}
                      >
                        <Camera className="size-3.5" aria-hidden="true" />
                        {localize(counterPhoto ? "Counter-photo attached (GPS stamped)" : "Attach counter-photo")}
                      </button>
                      {disputeErr && (
                        <p id={noteErrId} role="alert" className="text-[12px] font-medium text-[#b42318]">
                          {localize(disputeErr)}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <IosButton type="submit" tone="destructive" className="min-h-[40px] flex-1 text-[13px]">{tr("Freeze Escrow & Escalate")}</IosButton>
                        <IosButton
                          type="button"
                          tone="gray"
                          className="min-h-[40px] px-4 text-[13px]"
                          onClick={() => {
                            setDisputingId(null);
                            setDisputeErr(null);
                          }}
                        >{tr("Cancel")}{" "}</IosButton>
                      </div>
                    </form>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {sweep && (
          <IosSection header={tr("Scheduled Corridor Truck Telemetry")}>
            <p role="status" aria-live="polite" aria-atomic="true" className="px-4 pt-3 text-[13px] font-medium">{tr("Truck ETA:")}{" "}{localize(sweep.etaMinutes)}{" "}{tr("minutes ·")}{" "}{localize(sweep.distanceKm)}{" "}{tr("km away")}</p>
            <IosRow
              icon={<Truck className="size-4" />}
              iconTone="forest"
              title={tr("{0} · {1}", sweep.truckId, sweep.plate)}
              subtitle={tr("{0} · {1} km away ({2} mins)", sweep.scheduleLabel, sweep.distanceKm, sweep.etaMinutes)}
              trailing={<IosBadge>Active</IosBadge>}
            />
          </IosSection>
        )}

        <IosSection
          header={tr("Optional: recycling feeders & buy-back")}
          footer={tr("Instead of waiting for compactor trucks alone, sorted Blue-Box & Organic streams flow via Keke feeders and community MRFs.")}
        >
          {CIRCULAR_HUBS.map((hub) => (
            <IosRow
              key={hub.id}
              icon={<Recycle className="size-4" />}
              iconTone={hub.kind === "Blue-Box MRF Kiosk" ? "blue" : hub.kind === "Keke Feeder Tricycle" ? "forest" : "green"}
              title={localize(hub.name)}
              subtitle={tr("{0} · {1}", hub.kind, hub.schedule)}
              detail={localize(hub.distanceLabel)}
            />
          ))}
          {(model.recyclableDrops ?? defaultCircularDrops()).slice(0, 3).map((d) => (
            <IosRow
              key={d.id}
              icon={<CheckCircle2 className="size-4" />}
              iconTone="green"
              title={tr("{0}kg {1}", d.weightKg, d.materialLabel)}
              subtitle={tr("{0} · {1} · {2}kg CO₂ avoided", d.hubName, d.timestamp, d.co2SavedKg)}
              detail={tr("+{0}", money(d.earnedNgn))}
            />
          ))}
        </IosSection>

        {!open && partner && (
          <IosSection
            header={tr("Book an optional paid pickup")}
            footer={tr("{0} · {1} held in escrow until ward PSP accepts.", partner.name, money(partner.charge))}
          >
            <IosRow
              leading={<PartnerLogo partnerId={partner.id} name={partner.name} size="md" />}
              title={partner.name}
              subtitle={tr("{0} · {1}", partner.area, partner.rating)}
              detail={localize(money(partner.charge))}
            />
            {windows.map((w) => (
              <IosRow
                key={w}
                onClick={() => {
                  setWin(w);
                  setErr(null);
                  setReviewing(false);
                }}
                icon={<Clock className="size-4" />}
                iconTone={win === w ? "forest" : "slate"}
                title={localize(w)}
                selected={win === w}
              />
            ))}

            {err && (
              <div role="alert" className="px-4 py-2.5 text-[14px] font-medium text-[#c92117]">
                {localize(err)}
              </div>
            )}

            <div className="space-y-3 p-4">
              {reviewing ? (
                <section aria-label={tr("Review your request")} className="space-y-3 rounded-xl border border-border bg-muted p-4">
                  <PaymentDemoBadge />
                  <h3 className="text-[15px] font-semibold text-foreground">{tr("Check before you book")}</h3>
                  <dl className="space-y-2 text-[14px] text-foreground">
                    <div><dt className="font-semibold">{tr("Service and date")}</dt><dd>{localize(win)}</dd></div>
                    <div><dt className="font-semibold">{tr("Cost")}</dt><dd>{localize(money(partner.charge))}{tr(", held safely until the pickup is done. This is extra — not your weekly collection.")}</dd></div>
                    <div><dt className="font-semibold">{tr("Who comes")}</dt><dd>{partner.name}{tr(". You'll see the crew name once they accept.")}</dd></div>
                    <div><dt className="font-semibold">{tr("What next")}</dt><dd>{tr("Wait for them to accept before putting waste out. You can cancel any time before then and get the money back.")}</dd></div>
                  </dl>
                  <IosButton
                    tone="primary"
                    onClick={() => {
                      const res = requestPickup(win);
                      setErr(res);
                      if (!res) setReviewing(false);
                    }}
                  >{tr("Confirm booking ·")}{" "}{localize(money(partner.charge))}
                  </IosButton>
                  <IosButton tone="gray" onClick={() => setReviewing(false)}>{tr("Back")}</IosButton>
                </section>
              ) : (
                <IosButton tone="primary" onClick={() => { setErr(null); setReviewing(true); }}>{tr("Review booking ·")}{" "}{localize(money(partner.charge))}
                </IosButton>
              )}
            </div>
          </IosSection>
        )}

        <section className="space-y-2">
          <h2 className="eyebrow px-4">{tr("Pickup & lift log")}</h2>

          {model.pickups.length === 0 ? (
            <IosEmpty icon={<Truck className="size-5" />} title={tr("No supplementary lifts logged")}>{tr("Your weekly collection follows the schedule above. Extra pickups you book will show here.")}</IosEmpty>
          ) : (
            <div className="space-y-3">
              {model.pickups.map((p) => (
                <div key={p.id} className="ios-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/10 text-primary"
                      >
                        <Calendar className="size-4" />
                      </span>
                      <div>
                        <p className="text-[16px] font-semibold tracking-[-0.015em] text-foreground">{tr("Pickup")}{" "}{localize(p.id)}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                          {localize(p.window)} · {localize(money(p.amount))}
                        </p>
                        {p.crew && (
                          <p className="mt-0.5 text-[13px] text-muted-foreground">{tr("Crew:")}{" "}{localize(p.crew)}</p>
                        )}
                      </div>
                    </div>
                    <IosBadge>{p.status}</IosBadge>
                  </div>

                  <ol className="mt-4 ml-4 space-y-2 border-l border-[#3c3c43]/20 pl-3.5">
                    {p.history.map((h, i) => (
                      <li key={i} className="relative text-[13px] leading-[18px]">
                        <span
                          aria-hidden="true"
                          className="absolute -left-[18.5px] top-1.5 size-2 rounded-full bg-primary ring-2 ring-white"
                        />
                        <span className="font-semibold text-foreground">{localize(h.status)}</span>
                        <span className="text-muted-foreground"> · {localize(h.time)}</span>
                        {h.note && <span className="text-muted-foreground"> — {localize(h.note)}</span>}
                      </li>
                    ))}
                  </ol>

                  {p.status === "Requested" && (
                    <div className="mt-4 space-y-2">
                      {cancelId === p.id ? (
                        <div role="alertdialog" aria-label={tr("Confirm cancellation")} className="space-y-2 rounded-xl border border-border bg-muted p-3">
                          <p className="text-[14px] text-foreground">{tr("Cancel")}{" "}{localize(p.window)}? {localize(money(p.amount))}{" "}{tr("goes back to your wallet. Your weekly collection is not affected.")}</p>
                          <IosButton tone="destructive" className="min-h-[44px] text-[15px]" onClick={() => { cancelPickup(p.id); setCancelId(null); }}>{tr("Yes, cancel it")}</IosButton>
                          <IosButton tone="gray" className="min-h-[44px] text-[15px]" onClick={() => setCancelId(null)}>{tr("Keep my booking")}</IosButton>
                        </div>
                      ) : (
                        <IosButton tone="destructive" className="min-h-[44px] text-[15px]" onClick={() => setCancelId(p.id)}>{tr("Cancel request")}</IosButton>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Phone>
  );
}
