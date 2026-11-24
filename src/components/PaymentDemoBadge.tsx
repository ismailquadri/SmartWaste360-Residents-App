import { useLanguage } from "@/lib/language";
export function PaymentDemoBadge() {
  const { t: tr, localize } = useLanguage();
  return (
    <p className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-ember/10 px-2 text-[12px] font-semibold text-ember">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ember" />
      <span className="whitespace-nowrap">{tr("Demo Mode · No real bank charge")}</span>
    </p>
  );
}