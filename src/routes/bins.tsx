import { useLanguage } from "@/lib/language";
import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Lock, Recycle, Share2 } from "lucide-react";
import { FluxioDownload as Download, FluxioPackage as Package, FluxioPrinter as Printer, FluxioTrash as Trash2 } from "@/components/icons/FluxioIcons";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
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
  const { t: tr, localize } = useLanguage();
  const { model, partner, premise, requestBins, recordBagHandoff } = useStore();
  const compound = model.compound ?? createDefaultCompound();
  const [handoff, setHandoff] = useState<"idle" | "waiting">("idle");
  const [bagCount, setBagCount] = useState(2);
  const handoffs = (model.bagHandoffs ?? []).filter((h) => h.roomDuid === compound.myRoomDuid);
  const last = handoffs[0];
  const [size, setSize] = useState<number>(240);
  const [qty, setQty] = useState(1);
  const [stream, setStream] = useState<WasteStream>("blue_recyclables");
  const room = Math.max(0, 5 - model.bins.length);
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const myRoom = compound.rooms.find((r) => r.duid === compound.myRoomDuid) ?? compound.rooms[1];
  const isCompound = premise?.id === "HOME-042" || model.bins.some((b) => b.id === "BIN-1042");
  const activeStream = WASTE_STREAMS.find((s) => s.id === stream) ?? WASTE_STREAMS[0]!;
  const passRef = useRef<HTMLDivElement>(null);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const bagCode = myRoom?.bagQrCode ?? "ROOM-QR-BAG-042-RM02";
  const passText = `LAWMA Green Bag pass\n${myRoom?.roomLabel ?? ""} · ${compound.compoundName}\nCode: ${bagCode}\nShow this to the collection crew. They scan it or read the code, match the room, then confirm pickup.`;
  const svgMarkup = () => {
    const svg = passRef.current?.querySelector("svg");
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  };
  const printPass = () => {
    const svg = svgMarkup();
    const w = window.open("", "_blank", "width=480,height=700");
    if (!svg || !w) { setPassMsg("Couldn't open the print view. Allow pop-ups and try again."); return; }
    w.document.write(`<!doctype html><title>${bagCode}</title><body style="font-family:sans-serif;text-align:center;padding:24px"><h1 style="font-size:20px">LAWMA Green Bag pass</h1><p>${myRoom?.roomLabel ?? ""} · ${compound.compoundName}</p><div style="width:260px;margin:16px auto">${svg}</div><p style="font:700 26px monospace;letter-spacing:1px">${bagCode}</p><p style="font-size:14px">Crew: scan the code or read it aloud, match the room, then confirm pickup.</p></body>`);
    w.document.close(); w.focus(); w.print();
  };
  const downloadPass = () => {
    const svg = svgMarkup();
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${bagCode}.svg`; document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPassMsg("QR code saved to your downloads.");
  };
  const sharePass = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Green Bag pass", text: passText }); return; } catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(passText); setPassMsg("Pass copied. Paste it into a message to your caretaker."); }
    catch { setPassMsg("Couldn't copy. Read the large code to your caretaker instead."); }
  };

  return (
    <Phone>
      <PageTitle
        title={tr("Bins & Green Bags")}
        sub={localize(partner ? `Collector: ${partner.name}` : undefined)}
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
            header={tr("My Green Collection Bags")}
            footer={tr("When the shared drum is locked, rooms that have paid hand their Green Bags straight to the crew.")}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{tr("Green Bag pass ·")}{" "}{localize(myRoom.roomLabel)}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{tr("14 of 20 bags left ·")}{" "}{localize(myRoom.virtualAccount)}</p>
                </div>
                <IosBadge>{myRoom.paidThisMonth ? "Room paid" : "Payment due"}</IosBadge>
              </div>
              <div ref={passRef} className="mx-auto mt-4 w-fit rounded-xl bg-card p-3 ring-1 ring-border">
                <QRCodeSVG value={bagCode} size={208} level="M" marginSize={2} title={tr("Green Bag pass {0}", bagCode)} />
              </div>
              <p className="mt-3 text-center text-[12px] text-muted-foreground">{tr("No scanner? Read this code aloud:")}</p>
              <p className="mt-1 break-all text-center font-mono text-[24px] font-bold tracking-wide text-foreground">{bagCode}</p>
              {quorum.isQuarantined && (
                <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-muted px-3 py-2 text-[12px] font-medium text-foreground">
                  <Lock className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />{tr("Shared drum is locked (")}{localize(quorum.paidCount)}{" "}{tr("of")}{" "}{localize(quorum.totalRooms)}{" "}{tr("rooms paid). Hand your Green Bags to the crew with this pass.")}</div>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <IosButton tone="gray" onClick={printPass} className="min-h-[44px] px-2 text-[14px]"><Printer className="size-4" aria-hidden="true" />{tr("Print")}</IosButton>
                <IosButton tone="gray" onClick={downloadPass} className="min-h-[44px] px-2 text-[14px]"><Download className="size-4" aria-hidden="true" />{tr("Save")}</IosButton>
                <IosButton tone="gray" onClick={() => void sharePass()} className="min-h-[44px] px-2 text-[14px]"><Share2 className="size-4" aria-hidden="true" />{tr("Caretaker")}</IosButton>
              </div>
              {passMsg && <p role="status" className="mt-2 text-center text-[13px] text-muted-foreground">{localize(passMsg)}</p>}
              <section aria-label={tr("Bag handoff")} className="mt-4 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-semibold text-foreground">{tr("Collection check")}</p>
                  <IosBadge>{!last ? "No handoff yet" : last.status === "Verified" ? "Verified" : "Not verified"}</IosBadge>
                </div>
                {last && (
                  <div role="status" className={last.status === "Verified" ? "mt-2 rounded-lg bg-muted p-3 text-[13px] text-foreground" : "mt-2 rounded-lg border border-destructive bg-muted p-3 text-[13px] text-foreground"}>
                    <p className="font-semibold">{localize(last.status === "Verified" ? "✓ Collection verified" : "✗ Not verified — your bags were not taken")}</p>
                    <p className="mt-0.5">{localize(last.reason)}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{localize(last.id)} · {localize(last.crew)} · {localize(last.truckId)} · {localize(last.at)}</p>
                    {last.status === "Rejected" && <p className="mt-1 text-muted-foreground">{tr("Keep your bags. Pay your room share or ask the crew to rescan, then try again.")}</p>}
                  </div>
                )}
                {handoff === "idle" ? (
                  <IosButton tone="primary" className="mt-3 min-h-[44px] text-[15px]" onClick={() => setHandoff("waiting")}>{tr("The crew is here — hand over bags")}</IosButton>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-[13px] text-muted-foreground">{tr("Hold up the QR code above for the crew to scan. You'll see the result here straight away.")}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-foreground">{tr("Bags handed over")}</span>
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-[17px] font-semibold tabular-nums">{localize(bagCount)}</span>
                        <IosStepper value={bagCount} min={1} max={10} onChange={setBagCount} label={tr("Bags handed over")} />
                      </div>
                    </div>
                    <p className="rounded-lg bg-muted p-2 text-[12px] text-muted-foreground">{tr("Demo: there's no real crew app yet, so use these buttons to act as the crew's scanner.")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <IosButton tone="primary" className="min-h-[44px] text-[14px]" onClick={() => { recordBagHandoff(bagCode, bagCount); setHandoff("idle"); }}>{tr("Crew scans my pass")}</IosButton>
                      <IosButton tone="gray" className="min-h-[44px] text-[14px]" onClick={() => { recordBagHandoff(bagCode.replace(/\d+$/, (n) => String((Number(n) % 10) + 1).padStart(2, "0")), bagCount); setHandoff("idle"); }}>{tr("Crew scans wrong pass")}</IosButton>
                    </div>
                    <IosButton tone="gray" className="min-h-[44px] text-[14px]" onClick={() => setHandoff("idle")}>{tr("Cancel")}</IosButton>
                  </div>
                )}
                {handoffs.length > 1 && (
                  <details className="mt-3 text-[13px]">
                    <summary className="cursor-pointer font-semibold text-primary">{tr("Past handoffs (")}{localize(handoffs.length)})</summary>
                    <ul className="mt-2 space-y-1.5">
                      {handoffs.map((h) => (
                        <li key={h.id} className="flex justify-between gap-2 text-muted-foreground">
                          <span>{localize(h.at)} · {localize(h.bags)}{" "}{tr("bag")}{localize(h.bags === 1 ? "" : "s")}</span>
                          <span className="font-semibold text-foreground">{localize(h.status === "Verified" ? "Verified" : "Not verified")}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
              <div className="mt-4 rounded-xl bg-muted p-3 text-[13px] text-foreground">
                <p className="font-semibold">{tr("How the crew checks your pass")}</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li>{tr("The crew scans the QR code, or you read the code aloud.")}</li>
                  <li>{tr("Their app shows your room and whether it has paid.")}</li>
                  <li>{tr("They collect your bags and confirm the pickup. You'll see it in Activity.")}</li>
                </ol>
                <p className="mt-2 text-muted-foreground">{tr("Works offline: a printed pass or the code read aloud is enough.")}</p>
              </div>
            </div>
          </IosSection>
        )}

        {model.bins.length === 0 ? (
          <IosEmpty icon={<Package className="size-5" />} title={tr("No smart bins yet")}>{tr("Request your first household bin below to start scheduled pickups.")}</IosEmpty>
        ) : (
          <IosSection header={tr("Assigned bins")}>
            {model.bins.map((b) => (
              <IosRow
                key={b.id}
                icon={<Trash2 className="size-4" />}
                iconTone={b.state === "Active" ? "green" : "ember"}
                title={tr("{0}L Smart Bin", b.size)}
                subtitle={tr("Asset ID: {0}", b.id)}
                trailing={<IosBadge>{b.state}</IosBadge>}
              />
            ))}
          </IosSection>
        )}

        <IosSection
          header={tr("3-Stream Source Segregation")}
          footer={tr("Separating dry recyclables (Blue) and organics (Green) keeps valuable material out of landfills and credits your wallet.")}
        >
          <div className="p-4">
            <IosSegmentedControl
              label={tr("Waste stream")}
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
                  <Leaf className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4 text-[#5c5c62]" aria-hidden="true" />
                )}
                <span>{localize(activeStream.title)}</span>
              </div>
              <p className="mt-1.5 text-muted-foreground">
                <strong>{tr("Items:")}</strong> {localize(activeStream.examples)}
              </p>
              <p className="mt-1 text-muted-foreground">
                <strong>{tr("Route:")}</strong> {localize(activeStream.destination)}
              </p>
              <p className="mt-1 font-medium text-primary">{localize(activeStream.incentiveNote)}</p>
            </div>
          </div>
        </IosSection>

        {room > 0 && (
          <IosSection
            header={tr("Request new bins")}
            footer={tr("Requests are dispatched immediately to your assigned PSP collection partner.")}
          >
            <div className="px-4 py-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[15px] font-medium text-foreground">{tr("Bin capacity")}</span>
                <span className="text-[13px] text-muted-foreground">{localize(size)}{" "}{tr("litres")}</span>
              </div>
              <IosSegmentedControl
                label={tr("Bin capacity")}
                options={sizes}
                value={size}
                onChange={(v) => setSize(v)}
              />
            </div>

            <div className="flex min-h-[54px] items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-[16px] font-medium text-foreground">{tr("Quantity")}</p>
                <p className="text-[13px] text-muted-foreground">{tr("Up to")}{" "}{localize(room)}{" "}{tr("available")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-[17px] font-semibold tabular-nums">{localize(qty)}</span>
                <IosStepper value={qty} min={1} max={room} onChange={setQty} label={tr("Bin quantity")} />
              </div>
            </div>

            <div className="p-4">
              <IosButton
                tone="primary"
                onClick={() => {
                  requestBins(size, qty);
                  setQty(1);
                }}
              >{tr("Send request (")}{localize(qty)} × {localize(size)}{tr("L)")}</IosButton>
            </div>
          </IosSection>
        )}
      </div>
    </Phone>
  );
}
