import { Languages } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IosSheet } from "@/components/ios";
import { LANGUAGES, useLanguage } from "@/lib/language";

export function LanguageSelector({ full = false }: { full?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];
  return (
    <>
      <Button variant="ghost" aria-label={t("App language")} onClick={() => setOpen(true)} className={full ? "min-h-11 w-full justify-between px-3" : "min-h-11 shrink-0 gap-1.5 px-2 text-[12px]"}>
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="whitespace-nowrap">{full ? selected.name : selected.short}</span>
      </Button>
      <IosSheet open={open} onClose={() => setOpen(false)} title={t("Choose language")}>
        <div className="space-y-1" role="group" aria-label={t("App language")}>
          {LANGUAGES.map((item) => (
            <Button key={item.code} variant={language === item.code ? "secondary" : "ghost"} aria-pressed={language === item.code} onClick={() => { setLanguage(item.code); setOpen(false); }} className="min-h-12 w-full justify-between px-3">
              <span lang={item.code}>{item.name}</span>
              <span aria-hidden="true" className="font-mono text-[11px] text-muted-foreground">{item.short}{language === item.code ? " ✓" : ""}</span>
            </Button>
          ))}
        </div>
      </IosSheet>
    </>
  );
}