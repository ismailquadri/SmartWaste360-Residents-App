import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Lock, Package, QrCode, Recycle, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageTitle, Phone } from "@/components/app";
import { PartnerLogo } from "@/components/PartnerLogo";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosRow,
  IosSection,
  IosSegmentedControl,
  IosStepper,
} from "@/components/ios";
import { meta } from "@/lib/meta";
import {
  createDefaultCompound,
  evaluateCompoundQuorum,
  WASTE_STREAMS,
  type WasteStream,
} from "@/lib/resident-ops";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/bins")({
  head: () => meta("My bins", "Request smart bins and follow their delivery from your partner."),
  component: Bins,
});

const sizes = [
  { value: 120, label: "120L" },
  { value: 240, label: "240L" },
  { value: 360, label: "360L" },
] as const;

function Bins() {
  const { model, partner, premise, requestBins } = useStore();
  const [size, setSize] = useState<number>(240);
  const [qty, setQty] = useState(1);
  const [stream, setStream] = useState<WasteStream>("blue_recyclables");
  const room = Math.max(0, 5 - model.bins.length);
  const compound = model.compound ?? createDefaultCompound();
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const myRoom = compound.rooms.find((r) => r.duid === compound.myRoomDuid) ?? compound.rooms[1];
  const isCompound = premise?.id === "HOME-042" || model.bins.some((b) => b.id === "BIN-1042");
  const activeStream = WASTE_STREAMS.find((s) => s.id === stream) ?? WASTE_STREAMS[0]!;

  return (
    <Phone>
      <PageTitle
        title="Bins & Green Bags"
        sub={partner ? `Serviced by Statutory Ward PSP ${partner.name}.` : undefined}
      />

      {partner && (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1.5 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]">
          <PartnerLogo partnerId={partner.id} name={partner.name} size="xs" />
          <span className="text-[13px] font-medium text-foreground">{partner.name}</span>
        </div>
      )}

      <div className="space-y-6">
        {isCompound && myRoom && (
          <IosSection
            header="My Green Collection Bags (Quarantine Bypass)"
            footer="When a compound drum is quarantined (<60% room quorum), settled rooms hand serialized Green QR Bags directly to the PSP compactor crew."
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#17593a] text-white">
                    <ShoppingBag className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">
                      Serialized Room Bag Pass · {myRoom.roomLabel}
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] font-semibold text-[#17593a]">
                      {myRoom.bagQrCode}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Roll status: 14 of 20 bags left · Linked to {myRoom.virtualAccount}
                    </p>
                  </div>
                </div>
                <IosBadge>{quorum.isQuarantined ? "Active" : "Paid"}</IosBadge>
              </div>
              {quorum.isQuarantined && (
                <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#fef3f2] px-3 py-2 text-[12px] font-medium text-[#912018]">
                  <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                  Communal bins BIN-1042/1043 quarantined ({quorum.quorumPct}% quorum). Show this QR on truck arrival.
                </div>
              )}
              <div className="mt-3 flex items-center justify-between rounded-[12px] bg-[#e8f3ec] px-3 py-2.5 text-[12px] text-[#12472e]">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <QrCode className="size-4" aria-hidden="true" />
                  Scan-at-Hopper Verified
                </span>
                <span className="font-mono">{compound.myRoomDuid}</span>
              </div>
            </div>
          </IosSection>
        )}

        {model.bins.length === 0 ? (
          <IosEmpty icon={<Package className="size-5" />} title="No smart bins yet">
            Request your first household bin below to start scheduled pickups.
          </IosEmpty>
        ) : (
          <IosSection header="Assigned bins">
            {model.bins.map((b) => (
              <IosRow
                key={b.id}
                icon={<Trash2 className="size-4" />}
                iconTone={b.state === "Active" ? "green" : "ember"}
                title={`${b.size}L Smart Bin`}
                subtitle={`Asset ID: ${b.id}`}
                trailing={<IosBadge>{b.state}</IosBadge>}
              />
            ))}
          </IosSection>
        )}

        <IosSection
          header="3-Stream Source Segregation"
          footer="Separating dry recyclables (Blue) and organics (Green) keeps valuable material out of landfills and credits your wallet."
        >
          <div className="p-4">
            <IosSegmentedControl
              label="Waste stream"
              value={stream}
              onChange={setStream}
              options={[
                { value: "blue_recyclables" as const, label: "Blue Box" },
                { value: "green_organic" as const, label: "Organics" },
                { value: "black_residual" as const, label: "Residual" },
              ]}
            />
            <div className="mt-3 rounded-[12px] bg-[#f2f2f7] p-3.5 text-[13px]">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                {stream === "blue_recyclables" ? (
                  <Recycle className="size-4 text-[#007aff]" aria-hidden="true" />
                ) : stream === "green_organic" ? (
                  <Leaf className="size-4 text-[#17593a]" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4 text-[#5c5c62]" aria-hidden="true" />
                )}
                <span>{activeStream.title}</span>
              </div>
              <p className="mt-1.5 text-muted-foreground">
                <strong>Items:</strong> {activeStream.examples}
              </p>
              <p className="mt-1 text-muted-foreground">
                <strong>Route:</strong> {activeStream.destination}
              </p>
              <p className="mt-1 font-medium text-[#17593a]">{activeStream.incentiveNote}</p>
            </div>
          </div>
        </IosSection>

        {room > 0 && (
          <IosSection
            header="Request new bins"
            footer="Requests are dispatched immediately to your assigned PSP collection partner."
          >
            <div className="px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[15px] font-medium text-foreground">Bin capacity</span>
                <span className="text-[13px] text-muted-foreground">{size} litres</span>
              </div>
              <IosSegmentedControl
                label="Bin capacity"
                options={sizes}
                value={size}
                onChange={(v) => setSize(v)}
              />
            </div>

            <div className="flex min-h-[54px] items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-[16px] font-medium text-foreground">Quantity</p>
                <p className="text-[13px] text-muted-foreground">Up to {room} available</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-[17px] font-semibold tabular-nums">{qty}</span>
                <IosStepper value={qty} min={1} max={room} onChange={setQty} label="Bin quantity" />
              </div>
            </div>

            <div className="p-4">
              <IosButton
                tone="primary"
                onClick={() => {
                  requestBins(size, qty);
                  setQty(1);
                }}
              >
                Send request ({qty} × {size}L)
              </IosButton>
            </div>
          </IosSection>
        )}
      </div>
    </Phone>
  );
}
