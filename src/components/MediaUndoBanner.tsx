import { useLanguage } from "@/lib/language";
import { IosButton } from "@/components/ios";

export function MediaUndoBanner({ label, onUndo }: { label: string; onUndo: () => void }) {
  const { t: tr, localize } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-1 text-left">
      <p role="status" aria-live="polite" className="text-[13px] font-medium text-foreground">{localize(label)}</p>
      <IosButton tone="tinted" onClick={onUndo} className="min-h-11 w-auto shrink-0 px-3 text-[13px]">{tr("Undo")}</IosButton>
    </div>
  );
}