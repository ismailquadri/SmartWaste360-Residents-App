import { useLanguage } from "@/lib/language";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { FluxioActivity as Activity, FluxioCloudRain as CloudRain, FluxioHome as Home, FluxioMenu as Menu, FluxioMic as Mic, FluxioPackage as Package, FluxioQrCode as QrCode, FluxioUser as User, FluxioWallet as Wallet } from "@/components/icons/FluxioIcons";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import mark from "@/assets/smartwaste-icon.png";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosField,
  type IosButtonTone,
} from "./ios";

const tabsLeft = [
  { to: "/", label: "Home", icon: Home },
  { to: "/bins", label: "Pass", icon: QrCode },
] as const;

const tabsRight = [
  { to: "/wallet", label: "Wallet", icon: Wallet },
] as const;

function DockTab({ to, label, icon: Icon, path }: { to: string; label: string; icon: typeof Home; path: string }) {
  const { t: tr, localize } = useLanguage();
  const on = to === "/" ? path === "/" : path.startsWith(to);
  return (
    <Link to={to} aria-current={on ? "page" : undefined} className={cn("relative flex min-h-[60px] flex-col items-center justify-center gap-1", on ? "text-ember" : "text-muted-foreground")}>
      {on && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-ember" />}
      <Icon className="fluxio-icon size-[22px]" strokeWidth={on ? 2.2 : 1.8} aria-hidden="true" />
      <span className="whitespace-nowrap text-[11px] font-semibold leading-none">{localize(label)}</span>
    </Link>
  );
}

const drawer = [
  {
    group: "Everyday",
    items: [
      { to: "/", search: {}, hash: "", label: "Home", sub: "Truck ETA and next step", icon: Home },
      { to: "/activity", search: {}, hash: "", label: "Pickups", sub: "Schedule and clearance checks", icon: Activity },
      { to: "/bins", search: {}, hash: "", label: "Bins & Green Bag pass", sub: "Show your QR to the crew", icon: Package },
    ],
  },
  {
    group: "Money",
    items: [
      { to: "/wallet", search: {}, hash: "", label: "Wallet", sub: "Pay your room share", icon: Wallet },
    ],
  },
  {
    group: "Report & safety",
    items: [
      { to: "/report", search: { mode: "voice" as const }, hash: "", label: "Voice report", sub: "Pidgin, Yorùbá, Igbo, Hausa", icon: Mic },
      { to: "/bins", search: {}, hash: "", label: "Bag handoff check", sub: "Confirm the crew took your bag", icon: QrCode },
      { to: "/", search: {}, hash: "skips", label: "Flood skips", sub: "Free skips near you", icon: CloudRain },
    ],
  },
  {
    group: "Account",
    items: [
      { to: "/you", search: {}, hash: "", label: "Profile & cases", sub: "Address, phone, reports", icon: User },
    ],
  },
] as const;

function Dock({ path }: { path: string }) {
  const { t: tr, localize } = useLanguage();
  const [open, setOpen] = useState(false);
  const { model, premise } = useStore();
  const compound = model.compound;
  const myRoom = compound?.rooms.find((r) => r.duid === compound.myRoomDuid);
  const roomPaid = myRoom ? myRoom.paidThisMonth : model.balance >= 0;
  const sweep = model.corridorSweep;
  const initials = (model.name || "R").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <>
      <nav aria-label={tr("Primary tabs")} style={{ viewTransitionName: "dock" }} className="app-dock fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-[430px] grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
        {tabsLeft.map((t) => (
          <DockTab key={t.to} to={t.to} label={localize(t.label)} icon={t.icon} path={path} />
        ))}
        <Link
          to="/report"
          search={{ mode: "voice" as const }}
          aria-label={tr("Voice report")}
          aria-current={path.startsWith("/report") ? "page" : undefined}
          className="relative flex min-h-[60px] flex-col items-center justify-center gap-1"
        >
          <span
            aria-hidden="true"
            className={cn(
              "fluxio-icon flex size-12 -translate-y-3 items-center justify-center rounded-full border-4 border-card bg-ember text-ember-foreground transition-transform active:scale-95 [&_svg]:text-ember-foreground",
              path.startsWith("/report") && "ring-2 ring-ember/30",
            )}
          >
            <Mic className="size-[22px]" strokeWidth={2} />
          </span>
          <span className={cn("-mt-2 whitespace-nowrap text-[11px] font-semibold leading-none", path.startsWith("/report") ? "text-ember" : "text-muted-foreground")}>{tr("Report")}</span>
        </Link>
        {tabsRight.map((t) => (
          <DockTab key={t.to} to={t.to} label={localize(t.label)} icon={t.icon} path={path} />
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button type="button" className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-muted-foreground">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" className="fluxio-icon size-[22px]" aria-hidden="true">
                <rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="2" /><circle cx="17" cy="17" r="3.5" />
              </svg>
              <span className="whitespace-nowrap text-[11px] font-semibold leading-none">{tr("Menu")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex h-full max-h-full w-[86%] max-w-[360px] flex-col overflow-y-auto overscroll-contain border-l border-border bg-card p-0">
            <SheetHeader className="space-y-0 border-b border-border px-5 pb-4 pt-5 text-left">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ember text-[15px] font-bold text-ember-foreground">{initials}</span>
                <div className="min-w-0">
                  <SheetTitle className="truncate font-display text-[17px] font-bold">{model.name || "Resident"}</SheetTitle>
                  <p className="truncate text-[12px] text-muted-foreground">{localize(premise ? `${premise.address}, ${premise.area}` : "No address yet")}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                <span className="min-w-0 truncate text-[13px] font-semibold">{localize(myRoom ? `${myRoom.roomLabel} · ${compound?.compoundName ?? ""}` : "Single household")}</span>
                <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", roomPaid ? "bg-ember/10 text-ember" : "bg-destructive/10 text-destructive")}>{localize(roomPaid ? "Paid" : "Due")}</span>
              </div>
              {sweep && (
                <div className="mt-2 inline-flex items-center gap-2 self-start rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold">
                  <span aria-hidden="true" className={cn("size-1.5 rounded-full", sweep.proximityAlertActive ? "animate-pulse bg-ember" : "bg-muted-foreground")} />
                  <span role="status" aria-live="polite" aria-atomic="true" className="whitespace-nowrap font-mono uppercase tracking-wide">{localize(sweep.truckId)} · {localize(sweep.etaMinutes)}{" "}{tr("min ·")}{" "}{localize(sweep.distanceKm)}{" "}{tr("km")}</span>
                </div>
              )}
            </SheetHeader>
            <div className="border-b border-border px-3 py-2"><LanguageSelector full /></div>
            <div className="flex-1 px-3 py-2">
              {drawer.map((g) => (
                <div key={g.group} className="py-1.5">
                  <p className="px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{localize(g.group)}</p>
                  {g.items.map((q) => {
                    const on = !q.hash && (q.to === "/" ? path === "/" : path.startsWith(q.to)) && q.label !== "Bag handoff check";
                    return (
                      <Link key={q.label} to={q.to} search={q.search as never} hash={q.hash} onClick={() => setOpen(false)} aria-current={on ? "page" : undefined} className={cn("relative flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-1.5 transition-colors", on ? "bg-card text-foreground shadow-soft ring-1 ring-ember/25" : "hover:bg-muted")}>
                        {on && <span aria-hidden="true" className="absolute inset-y-3 left-0.5 w-[3px] rounded-full bg-ember" />}
                        <q.icon className={cn("fluxio-icon size-5 shrink-0", on ? "text-ember" : "text-muted-foreground")} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{localize(q.label)}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">{localize(q.sub)}</span>
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 pb-6 pt-4">
              <p className="pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{tr("Emergency")}</p>
              <div className="grid grid-cols-2 gap-2">
                <a href="tel:08000052962" className="flex min-h-[52px] flex-col justify-center rounded-lg bg-ember px-3 text-ember-foreground active:opacity-90">
                  <span className="text-[11px] font-semibold opacity-90">{tr("Dispatch")}</span>
                  <span className="whitespace-nowrap text-[14px] font-bold">{tr("0800-00-LAWMA")}</span>
                </a>
                <a href={"tel:" + encodeURIComponent("*384*529#")} className="flex min-h-[52px] flex-col justify-center rounded-lg border border-border px-3">
                  <span className="text-[11px] font-semibold text-muted-foreground">{tr("No data? Dial")}</span>
                  <span className="whitespace-nowrap font-mono text-[14px] font-bold">*384*529#</span>
                </a>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}

export function Phone({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { t: tr, localize } = useLanguage();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isOnboarded, ready } = useStore();
  if (nav && path !== "/" && !ready) return <div className="mx-auto min-h-screen max-w-[430px] bg-background" />;
  if (nav && path !== "/" && !isOnboarded) return <Navigate to="/" />;
  return (
    <div className="app-phone mx-auto flex min-h-screen max-w-[430px] flex-col bg-background">
      <main className={cn("ios-stagger flex-1 px-4 pt-5", nav ? "pb-[calc(8rem+env(safe-area-inset-bottom))]" : "pb-8")} style={{ viewTransitionName: "page" }}>
        {localize(children)}
      </main>
      {nav && <Dock path={path} />}
    </div>
  );
}

export function LinkStatus() {
  const { t: tr, localize } = useLanguage();
  const { link } = useStore();
  const label =
    link === "demo"
      ? "On-device"
      : link === "connected"
        ? "Connected"
        : link === "offline"
          ? "Offline"
          : "Connecting…";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[12px] font-medium text-muted-foreground ring-1 ring-black/[0.07]">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          link === "connected" || link === "demo" ? "bg-success" : link === "offline" ? "bg-destructive" : "bg-warning",
        )}
      />
      {localize(label)}
    </span>
  );
}

export const brandMark = mark;

export function Brand() {
  const { t: tr, localize } = useLanguage();
  return (
    <div className="flex items-center gap-2">
      <img src={mark} alt="" className="size-7 rounded-[7px]" />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">SmartWaste360</span>
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string | undefined }) {
  const { t: tr, localize } = useLanguage();
  return (
    <header className="app-topbar sticky z-20 -mx-4 mb-5 border-b border-transparent bg-background px-[18px] pb-3 pt-2">
      <div className="flex items-start justify-between gap-2"><h1 className="min-w-0 font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">{localize(title)}</h1><LanguageSelector /></div>
      {sub && <p className="mt-1 text-[15px] leading-[20px] text-muted-foreground">{localize(sub)}</p>}
    </header>
  );
}

export function Btn({
  tone = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: IosButtonTone | undefined }) {
  return <IosButton tone={tone} type={type} {...props} />;
}

export function Card({ className, children }: { className?: string | undefined; children: ReactNode }) {
  const { t: tr, localize } = useLanguage();
  return <div className={cn("ios-card p-4", className)}>{localize(children)}</div>;
}

export function Field(props: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string | undefined }) {
  return (
    <div className="ios-group">
      <IosField {...props} />
    </div>
  );
}

export function Pill({ children }: { children: string }) {
  const { t: tr, localize } = useLanguage();
  return <IosBadge>{children}</IosBadge>;
}

export function Empty({
  icon,
  title,
  children,
}: {
  icon?: ReactNode | undefined;
  title?: string | undefined;
  children: ReactNode;
}) {
  const { t: tr, localize } = useLanguage();
  return (
    <IosEmpty icon={icon} title={localize(title)}>
      {localize(children)}
    </IosEmpty>
  );
}
