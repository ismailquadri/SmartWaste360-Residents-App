import { useLanguage } from "@/lib/language";
import { Landmark } from "lucide-react";
import { FluxioCheck as Check, FluxioMic as Mic } from "@/components/icons/FluxioIcons";
import { useState } from "react";
import { PartnerLogo } from "@/components/PartnerLogo";
import { LocalVoiceAgent } from "@/components/LocalVoiceAgent";
import {
  IosBadge,
  IosButton,
  IosRow,
  IosSection,
  IosSheet,
} from "@/components/ios";
import type { ReportDraft } from "@/lib/report-ai";
import { useStore } from "@/lib/store";

export function StickyVoiceFab() {
  const { t: tr, localize } = useLanguage();
  const { premise, partner, report } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [rawText, setRawText] = useState("");
  const [sent, setSent] = useState("");

  const handleClose = () => {
    setOpen(false);
    setDraft(null);
    setSent("");
    setRawText("");
  };

  const toggleRecipient = (who: "partner" | "lawma") => {
    if (!draft) return;
    setDraft({
      ...draft,
      sendTo: draft.sendTo.includes(who)
        ? draft.sendTo.filter((x) => x !== who)
        : [...draft.sendTo, who],
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tr("Open local dialect voice reporting assistant")}
        title={tr("Report dumping by voice")}
        className="group fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-30 flex size-[54px] items-center justify-center rounded-full bg-gradient-to-br from-ember to-[#ff8fa0] text-white ring-2 ring-white/90 shadow-[0_10px_24px_-4px_rgba(23,89,58,0.45),0_4px_12px_-2px_rgba(200,78,13,0.3)] transition-all hover:scale-105 active:scale-95 min-[480px]:bottom-[88px]"
      >
        <Mic className="size-6 transition-transform group-hover:scale-105" strokeWidth={2.2} aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-ember ring-2 ring-white"
        >
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
        </span>
      </button>

      <IosSheet
        open={open}
        onClose={handleClose}
        title={localize(sent ? "Report submitted" : draft ? "Review voice report" : "Local Voice Agent")}
      >
        {sent ? (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#248a3d]/15 text-[#17682c] animate-in zoom-in duration-300">
              <Check className="size-8" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[20px] font-bold tracking-[-0.02em] text-foreground">{tr("Sent to dispatch")}</p>
              <p className="mt-1 text-[14px] text-muted-foreground">{tr("Case")}{" "}<span className="font-semibold text-foreground">{sent}</span>{" "}{tr("is saved in your You tab.")}</p>
            </div>
            <IosButton tone="primary" onClick={handleClose}>{tr("Done")}</IosButton>
          </div>
        ) : draft ? (
          <div className="space-y-4 pt-1">
            <IosSection header={tr("Translated summary")}>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-[12px] font-medium text-muted-foreground">{tr("Issue category")}</p>
                  <p className="text-[16px] font-semibold text-foreground">{localize(draft.category)}</p>
                </div>
                <IosBadge>{draft.urgency === "high" ? "Urgent" : draft.urgency === "medium" ? "Medium" : "Low"}</IosBadge>
              </div>
              <div className="px-4 py-3">
                <p className="text-[12px] font-medium text-muted-foreground">{draft.title}</p>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-[20px] text-foreground">
                  {draft.report}
                </p>
              </div>
            </IosSection>

            <IosSection header={tr("Send to")}>
              <IosRow
                onClick={() => toggleRecipient("partner")}
                leading={<PartnerLogo partnerId={partner?.id} name={partner?.name} size="sm" />}
                title={localize(partner?.name ?? "Collection partner")}
                subtitle={tr("Missed pickups & bin servicing")}
                selected={draft.sendTo.includes("partner")}
              />
              <IosRow
                onClick={() => toggleRecipient("lawma")}
                icon={<Landmark className="size-4" />}
                iconTone="blue"
                title={tr("LAWMA Compliance")}
                subtitle={tr("Illegal dumping & drain clearance")}
                selected={draft.sendTo.includes("lawma")}
              />
            </IosSection>

            <div className="space-y-2.5 pt-1">
              <IosButton
                tone="ember"
                disabled={!draft.sendTo.length}
                onClick={() =>
                  setSent(
                    report(draft.category, draft.report, draft.sendTo, {
                      title: draft.title,
                      urgency: draft.urgency,
                      original: rawText,
                    }),
                  )
                }
              >{tr("Send report")}</IosButton>
              <IosButton tone="gray" onClick={() => setDraft(null)}>{tr("Record again")}</IosButton>
            </div>
          </div>
        ) : (
          <LocalVoiceAgent
            address={premise?.address}
            area={premise?.area}
            onDraftReady={(voiceDraft, raw) => {
              setRawText(raw);
              setDraft({
                category: voiceDraft.category,
                urgency: voiceDraft.urgency,
                sendTo: voiceDraft.sendTo,
                title: voiceDraft.title,
                report: voiceDraft.report,
              });
            }}
          />
        )}
      </IosSheet>
    </>
  );
}
