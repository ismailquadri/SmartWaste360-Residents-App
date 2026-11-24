import { useLanguage } from "@/lib/language";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { milestonesFor, type Milestone } from "@/lib/gamify";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/LanguageSelector";

const CLAIM_KEY = "lawma-claimed-milestones-v1";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
}

const SCENARIOS = [
  { id: "tenement", premise: "HOME-042", label: "10-Room Compound" },
  { id: "commercial", premise: "SHOP-150", label: "VI Shop Decal" },
  { id: "residential", premise: "HOME-018", label: "Ikeja Flat" },
] as const;

/** Pill segmented control to switch between the three demo resident scenarios. */
export function ScenarioSwitcher() {
  const { t: tr, localize } = useLanguage();
  const { model, loadPresetDemo } = useStore();
  const idx = Math.max(0, SCENARIOS.findIndex((s) => s.premise === model.premiseId));
  return (
    <div role="tablist" aria-label={tr("Resident scenario")} className="relative mt-4 grid grid-cols-3 rounded-[10px] border border-border bg-muted p-1">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-[8px] border border-border bg-card transition-transform duration-300"
        style={{ width: "calc((100% - 8px) / 3)", transform: `translateX(${idx * 100}%)` }}
      />
      {SCENARIOS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={i === idx}
          onClick={() => loadPresetDemo(s.id)}
          className={cn(
            "relative z-10 min-h-[44px] min-w-0 truncate whitespace-nowrap rounded-[8px] px-1 text-[12px] font-medium tracking-[-0.01em] transition-colors min-[400px]:text-[12.5px]",
            i === idx ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="block truncate" title={localize(s.label)}>{localize(s.label.replace("10-Room Compound", "10 Rooms"))}</span>
        </button>
      ))}
    </div>
  );
}

export function GameHub({ name, area }: { name: string; area: string }) {
  const { t: tr, localize } = useLanguage();
  const { model } = useStore();
  const milestones = useMemo(() => milestonesFor(model), [model]);
  const [claimed, setClaimed] = useState<string[] | null>(null);

  useEffect(() => {
    try { setClaimed(JSON.parse(localStorage.getItem(CLAIM_KEY) ?? "[]")); } catch { setClaimed([]); }
  }, []);
  const pending: Milestone | undefined = claimed ? milestones.find((b) => !claimed.includes(b.id)) : undefined;
  const claim = (id: string) => {
    const next = [...(claimed ?? []), id];
    setClaimed(next);
    localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
  };

  return (
    <>
      <header className="min-w-0">
        <div className="flex items-start justify-between gap-2">
        <h1 className="min-w-0 !text-[24px] font-extrabold leading-tight">{tr(greeting() === "Morning" ? "Good morning" : greeting() === "Afternoon" ? "Good afternoon" : "Good evening")}
        </h1>
        <LanguageSelector /></div>
        <p className="mt-0.5 text-[15px] font-semibold text-muted-foreground">{tr("Hi")}{" "}{name} · {area}{" "}{tr("corridor")}</p>
      </header>
      <ScenarioSwitcher />

      {pending && createPortal(
        <div role="dialog" aria-modal="true" aria-label={tr("Waste milestone")} className="badge-stage fixed inset-0 z-[60] mx-auto flex max-w-[430px] flex-col px-6 pb-10 pt-14 animate-in fade-in duration-300">
          <button type="button" onClick={() => claim(pending.id)} aria-label={tr("Close")} className="grid size-12 place-items-center rounded-[16px] bg-card text-foreground">
            <ChevronLeft className="size-5" />
          </button>
          <div className="relative flex flex-1 items-center justify-center">
            <div className="badge-rays absolute inset-0" aria-hidden="true" />
            <div className="badge-shield relative grid size-36 place-items-center animate-in zoom-in-50 duration-700">
              <span className="text-[60px]">{localize(pending.icon)}</span>
            </div>
          </div>
          <h2 className="text-center text-[30px] font-black leading-tight text-primary-foreground">{tr("Congrats!")}<br />{localize(pending.title)}</h2>
          <p className="mt-3 text-center text-[15px] font-semibold text-primary-foreground/85">{localize(pending.body)}</p>
          <button type="button" onClick={() => claim(pending.id)} className="mt-8 min-h-[58px] rounded-full bg-card text-[17px] font-bold text-foreground">{tr("Done")}</button>
        </div>,
        document.querySelector(".mockup-screen-shell") ?? document.body,
      )}
    </>
  );
}
