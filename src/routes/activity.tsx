import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { PageTitle, Phone } from "@/components/app";
import { PartnerLogo } from "@/components/PartnerLogo";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosRow,
  IosSection,
} from "@/components/ios";
import { money, OPEN_PICKUP } from "@/lib/customer-model";
import { meta } from "@/lib/meta";
import { defaultRemediations } from "@/lib/customer-model";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  validateSearch: z.object({ new: z.coerce.number().optional() }),
  head: () => meta("Activity", "Dual-Key remediation verification, corridor truck telemetry, and sweep logs."),
  component: ActivityPage,
});

const windows = [
  "Tue Corridor Sweep · 06:00–11:00 WAT",
  "Fri Corridor Sweep · 06:00–11:00 WAT",
  "Bulky / Flood-Prep Extra Lift · Sat 07:00",
] as const;

function ActivityPage() {
  const { model, partner, requestPickup, cancelPickup, resolveRemediation } = useStore();
  const [win, setWin] = useState<string>(windows[0]);
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
      <PageTitle title="Sweep & Dual-Key" sub="Verify PSP evacuations, monitor corridor sweeps, and release escrow." />

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="eyebrow px-4">Dual-Key Citizen Remediation</h2>
          <div className="space-y-3">
            {remediations.map((rem) => {
              const awaiting = rem.status === "Awaiting Citizen Key";
              const frozen = rem.status === "Disputed · Escrow Frozen";
              return (
                <div key={rem.id} className="ios-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px]",
                          awaiting
                            ? "bg-[#c84e0d]/12 text-[#c84e0d]"
                            : frozen
                              ? "bg-[#d92d20]/12 text-[#d92d20]"
                              : "bg-[#248a3d]/12 text-[#17682c]",
                        )}
                      >
                        {frozen ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold text-foreground">{rem.title}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {rem.id} · Ticket {rem.ticketRef} · Escrow {money(rem.escrowAmountNgn)}
                        </p>
                      </div>
                    </div>
                    <IosBadge>{rem.status}</IosBadge>
                  </div>

                  <p className="mt-2.5 rounded-[10px] bg-[#f2f2f7] px-3 py-2 text-[12px] text-muted-foreground">
                    {rem.afterPhotoSummary} · {rem.submittedAt}
                  </p>

                  {rem.citizenNote && (
                    <p className="mt-2 text-[12px] font-medium text-foreground">
                      Citizen note: {rem.citizenNote}
                    </p>
                  )}

                  {awaiting && disputingId !== rem.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <IosButton
                        tone="primary"
                        className="min-h-[42px] text-[13px]"
                        onClick={() => {
                          resolveRemediation(rem.id, "confirm");
                          setDisputeErr(null);
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 size-4" aria-hidden="true" />
                        Confirm Cleared
                      </IosButton>
                      <IosButton
                        tone="destructive"
                        className="min-h-[42px] text-[13px]"
                        onClick={() => {
                          setDisputingId(rem.id);
                          setDisputeErr(null);
                        }}
                      >
                        <AlertTriangle className="mr-1.5 size-4" aria-hidden="true" />
                        Dispute / Still Dirty
                      </IosButton>
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
                      <label htmlFor={noteInputId} className="block text-[12px] font-semibold text-[#912018]">
                        Counter-evidence to freeze {money(rem.escrowAmountNgn)} PSP escrow
                      </label>
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
                        placeholder="Describe what remains uncollected..."
                        className="w-full rounded-[10px] border border-[#d92d20]/30 bg-white px-3 py-2 text-[14px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]"
                      />
                      <button
                        type="button"
                        onClick={() => setCounterPhoto((v) => !v)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                          counterPhoto ? "bg-[#17593a] text-white" : "bg-white text-foreground ring-1 ring-black/10",
                        )}
                      >
                        <Camera className="size-3.5" aria-hidden="true" />
                        {counterPhoto ? "Counter-photo attached (GPS stamped)" : "Attach counter-photo"}
                      </button>
                      {disputeErr && (
                        <p id={noteErrId} role="alert" className="text-[12px] font-medium text-[#b42318]">
                          {disputeErr}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <IosButton type="submit" tone="destructive" className="min-h-[40px] flex-1 text-[13px]">
                          Freeze Escrow & Escalate
                        </IosButton>
                        <IosButton
                          type="button"
                          tone="gray"
                          className="min-h-[40px] px-4 text-[13px]"
                          onClick={() => {
                            setDisputingId(null);
                            setDisputeErr(null);
                          }}
                        >
                          Cancel
                        </IosButton>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {sweep && (
          <IosSection header="Scheduled Corridor Truck Telemetry">
            <IosRow
              icon={<Truck className="size-4" />}
              iconTone="forest"
              title={`${sweep.truckId} · ${sweep.plate}`}
              subtitle={`${sweep.scheduleLabel} · ${sweep.distanceKm} km away (${sweep.etaMinutes} mins)`}
              trailing={<IosBadge>Active</IosBadge>}
            />
          </IosSection>
        )}

        {!open && partner && (
          <IosSection
            header="Corridor & supplementary bulky requests"
            footer={`${partner.name} · ${money(partner.charge)} held in escrow until ward PSP accepts.`}
          >
            <IosRow
              leading={<PartnerLogo partnerId={partner.id} name={partner.name} size="md" />}
              title={partner.name}
              subtitle={`${partner.area} · ${partner.rating}`}
              detail={money(partner.charge)}
            />
            {windows.map((w) => (
              <IosRow
                key={w}
                onClick={() => {
                  setWin(w);
                  setErr(null);
                }}
                icon={<Clock className="size-4" />}
                iconTone={win === w ? "forest" : "slate"}
                title={w}
                selected={win === w}
              />
            ))}

            {err && (
              <div role="alert" className="px-4 py-2.5 text-[14px] font-medium text-[#c92117]">
                {err}
              </div>
            )}

            <div className="p-4">
              <IosButton tone="primary" onClick={() => setErr(requestPickup(win))}>
                Request corridor / extra lift · {money(partner.charge)}
              </IosButton>
            </div>
          </IosSection>
        )}

        <section className="space-y-2">
          <h2 className="eyebrow px-4">Pickup & lift log</h2>

          {model.pickups.length === 0 ? (
            <IosEmpty icon={<Truck className="size-5" />} title="No supplementary lifts logged">
              Your weekly ward sweeps follow the statutory schedule above.
            </IosEmpty>
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
                        <p className="text-[16px] font-semibold tracking-[-0.015em] text-foreground">
                          Pickup {p.id}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground tabular-nums">
                          {p.window} · {money(p.amount)}
                        </p>
                        {p.crew && (
                          <p className="mt-0.5 text-[13px] text-muted-foreground">Crew: {p.crew}</p>
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
                        <span className="font-semibold text-foreground">{h.status}</span>
                        <span className="text-muted-foreground"> · {h.time}</span>
                        {h.note && <span className="text-muted-foreground"> — {h.note}</span>}
                      </li>
                    ))}
                  </ol>

                  {p.status === "Requested" && (
                    <div className="mt-4">
                      <IosButton
                        tone="destructive"
                        className="min-h-[44px] text-[15px]"
                        onClick={() => cancelPickup(p.id)}
                      >
                        Cancel request
                      </IosButton>
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
