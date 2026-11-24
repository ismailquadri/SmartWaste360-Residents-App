import { useLanguage } from "@/lib/language";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { Leaf, Lock, Recycle } from "lucide-react";
import { FluxioBell as Bell, FluxioCloudRain as CloudRain, FluxioMapPin as MapPin, FluxioMic as Mic, FluxioLocation as Navigation, FluxioPackage as Package, FluxioQrCode as QrCode, FluxioZap as Radio, FluxioShieldCheck as ShieldCheck, FluxioTruck as Truck } from "@/components/icons/FluxioIcons";
import { useEffect, useState } from "react";
import { brandMark, Btn, LinkStatus, Phone } from "@/components/app";
import { GameHub } from "@/components/GameHub";
import { PartnerLogo } from "@/components/PartnerLogo";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosField,
  IosRow,
  IosSearchBar,
  IosSection,
  IosSheet,
} from "@/components/ios";
import wordmark from "@/assets/smartwaste360-white.svg";
import dawnImg from "@/assets/before-dawn.jpg";
import { money, OPEN_PICKUP, partners, premises } from "@/lib/customer-model";
import { meta } from "@/lib/meta";
import {
  buildMerchantDecal,
  createDefaultCompound,
  defaultCircularDrops,
  evaluateCircularSummary,
  evaluateCompoundQuorum,
  evaluateStormSurge,
} from "@/lib/resident-ops";
import { useStore } from "@/lib/store";
import deliveryImg from "@/assets/delivery.jpg";
import collectionImg from "@/assets/collection.jpg";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/LanguageSelector";

export const Route = createFileRoute("/")({
  head: () => meta("Home", "Your LAWMA 360 home: smart bins, pickups and your collection partner in one place."),
  component: Index,
});

function Index() {
  const { ready, introDone, completeIntro, model } = useStore();
  if (!ready) return <Splash />;
  if (!introDone) return <Intro onDone={completeIntro} />;
  if (!model.name) return <Profile />;
  if (!model.premiseId) return <Address />;
  if (!model.partnerId) return <ChoosePartner />;
  return <Home />;
}

function Splash() {
  const { t: tr, localize } = useLanguage();
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col items-center justify-center gap-4 bg-primary text-primary-foreground">
      <div className="grid size-20 place-items-center rounded-[22px] bg-white p-3 shadow-xl">
        <img src={brandMark} alt="" className="size-full object-contain animate-pulse" />
      </div>
      <img src={wordmark} alt="SmartWaste360" className="h-8" />
    </div>
  );
}

const slides = [
  { img: dawnImg, eyebrow: "Live truck", title: "Know when the truck is coming.", body: "Get a heads-up before it reaches your street." },
  { img: deliveryImg, eyebrow: "Green Bag pass", title: "Your bags, tracked.", body: "The crew scans your pass, so every pickup is on record." },
  { img: collectionImg, eyebrow: "Speak up safely", title: "Report dumping. Stay anonymous.", body: "Talk in Pidgin, Yorùbá, Igbo, Hausa or English." },
];

function Intro({ onDone }: { onDone: () => void }) {
  const { t: tr, localize } = useLanguage();
  const { loadPresetDemo } = useStore();
  const [i, setI] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  const s = slides[i]!;
  const last = i === slides.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(slides.length - 1, n)));
  return (
    <div
      className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-ink text-primary-foreground"
      onPointerDown={(e) => setX0(e.clientX)}
      onPointerUp={(e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        setX0(null);
      }}
    >
      <div className="relative min-h-[300px] flex-1 overflow-hidden">
        <img key={s.img} src={s.img} alt="" className="absolute inset-0 size-full object-cover animate-in fade-in zoom-in-105 duration-700" />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-x-5 top-6 flex items-center justify-between min-[480px]:top-14">
          <div className="flex items-center gap-2.5">
            <img src={brandMark} alt="" className="size-9 rounded-[8px] bg-card p-1" />
            <img src={wordmark} alt="SmartWaste360" className="h-6" />
          </div>
          <div className="flex items-center gap-1"><LanguageSelector />{!last && (
            <button type="button" onClick={onDone} className="min-h-[36px] px-2 text-[14px] font-medium opacity-80 hover:opacity-100">{tr("Skip")}</button>
          )}</div>
        </div>
        <div key={i} className="absolute inset-x-0 bottom-0 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="eyebrow text-ember">{localize(s.eyebrow)}</p>
          <h1 className="mt-2 text-[30px] font-bold leading-[1.1]">{localize(s.title)}</h1>
          <p className="mt-2 text-[16px] leading-[22px] opacity-85">{localize(s.body)}</p>
        </div>
      </div>
      <div className="space-y-4 px-5 pb-8 pt-5 min-[480px]:pb-10">
        <div className="flex justify-center gap-1.5" role="tablist" aria-label={tr("Intro slides")}>
          {slides.map((_, n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={tr("Slide {0}", n + 1)}
              onClick={() => go(n)}
              className={cn("h-1.5 rounded-full transition-all duration-300", n === i ? "w-8 bg-ember" : "w-1.5 bg-primary-foreground/35")}
            />
          ))}
        </div>
        <IosButton tone="ember" onClick={last ? onDone : () => go(i + 1)}>
          {localize(last ? "Get started" : "Next")}
        </IosButton>
        <button
          type="button"
          onClick={() => loadPresetDemo("tenement")}
          className="mx-auto block min-h-[36px] px-3 text-[13px] font-medium underline-offset-4 opacity-75 hover:underline hover:opacity-100"
        >{tr("Just exploring? Try the demo")}</button>
      </div>
    </div>
  );
}

function Steps({ n, title, sub, onBack }: { n: number; title: string; sub?: string | undefined; onBack?: (() => void) | undefined }) {
  const { t: tr, localize } = useLanguage();
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} className="min-h-[36px] text-[14px] font-medium text-muted-foreground hover:text-foreground">{tr("← Back")}</button>
        ) : (
          <img src={brandMark} alt="SmartWaste360" className="size-8 rounded-[7px]" />
        )}
        <div className="flex items-center gap-2"><span className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">{localize(n)} / 3</span><LanguageSelector /></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((k) => (
          <span key={k} className={cn("h-1 rounded-full transition-colors duration-500", k <= n ? "bg-ember" : "bg-border")} />
        ))}
      </div>
      <h1 key={title} className="mt-6 text-[28px] font-bold leading-[1.15] animate-in fade-in slide-in-from-bottom-2 duration-300">{localize(title)}</h1>
      {sub && <p className="mt-1.5 text-[15px] leading-[21px] text-muted-foreground">{localize(sub)}</p>}
    </div>
  );
}

const phoneOk = (v: string) => /^0[789][01]\d{8}$/.test(v.replace(/\D/g, ""));
const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7)].filter(Boolean).join(" ");
};

function Profile() {
  const { t: tr, localize } = useLanguage();
  const { start } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const first = name.trim().split(/\s+/)[0];
  const ok = name.trim().length > 1 && phoneOk(phone);
  return (
    <Phone nav={false}>
      <Steps n={1} title={localize(first ? `Nice to meet you, ${first}` : "What should we call you?")} sub={tr("The crew uses this to reach you.")} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) start(name.trim(), phone.replace(/\D/g, ""));
        }}
      >
        <IosField label={tr("Full name")} name="fullName" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Adaeze Okafor")} required autoComplete="name" enterKeyHint="next" />
        <IosField
          label={tr("Phone number")}
          name="phone"
          value={phone}
          onChange={(e) => setPhone(fmtPhone(e.target.value))}
          placeholder="0803 000 0000"
          inputMode="tel"
          required
          autoComplete="tel"
          enterKeyHint="done"
        />
        <p className={cn("px-1 text-[13px] transition-colors", phoneOk(phone) ? "text-success" : "text-muted-foreground")}>
          {localize(phoneOk(phone) ? "✓ Looks good" : phone ? "Enter an 11-digit Nigerian number" : "We never share your number.")}
        </p>
        <div className="pt-3">
          <IosButton type="submit" tone="ember" disabled={!ok}>{tr("Continue")}</IosButton>
        </div>
      </form>
    </Phone>
  );
}

function Address() {
  const { t: tr, localize } = useLanguage();
  const { choosePremise } = useStore();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState("");
  const list = premises.filter((p) => (p.address + p.area + p.detail).toLowerCase().includes(q.toLowerCase()));
  const areas = Array.from(new Set(premises.map((p) => p.area))).slice(0, 5);
  return (
    <Phone nav={false}>
      <Steps n={2} title={tr("Where do you live?")} sub={tr("We'll match you to your street's collector.")} />
      <IosSearchBar label={tr("Search your street or area")} value={q} onChange={setQ} placeholder={tr("Street or area")} />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {areas.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setQ(q === a ? "" : a)}
            className={cn(
              "min-h-[34px] shrink-0 rounded-[8px] border px-3 text-[13px] font-medium transition-colors",
              q === a ? "border-ember bg-ember/10 text-ember" : "border-border bg-card text-muted-foreground",
            )}
          >
            {localize(a)}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {list.length === 0 ? (
          <IosEmpty icon={<MapPin className="size-5" />} title={tr("No match yet")}>{tr("Try Ikeja, Yaba or Ajah.")}</IosEmpty>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPick(p.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-[9px] border bg-card p-3.5 text-left transition-colors",
                pick === p.id ? "border-ember" : "border-border hover:border-foreground/25",
              )}
            >
              <MapPin className={cn("size-5 shrink-0", pick === p.id ? "text-ember" : "text-muted-foreground")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{localize(p.address)}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{localize(p.area)}</span>
              </span>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[11px]", pick === p.id ? "border-ember bg-ember text-ember-foreground" : "border-border")}>
                {localize(pick === p.id ? "✓" : "")}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="sticky bottom-4 mt-5 min-[480px]:bottom-6">
        <IosButton tone="ember" disabled={!pick} onClick={() => choosePremise(pick)}>{tr("This is my home")}</IosButton>
      </div>
    </Phone>
  );
}

function ChoosePartner() {
  const { t: tr, localize } = useLanguage();
  const { choosePartner, premise, statutoryPartner } = useStore();
  const [others, setOthers] = useState(false);
  const p = statutoryPartner;
  return (
    <Phone nav={false}>
      <Steps n={3} title={tr("Meet your collector")} sub={tr("Licensed by LAWMA to serve {0}.", premise?.address ?? "your street")} />
      {p ? (
        <div className="rounded-[9px] border border-ember bg-card p-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <PartnerLogo partnerId={p.id} name={p.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{localize(p.name)}</p>
              <p className="truncate text-[13px] text-muted-foreground">{localize(p.area)}</p>
            </div>
            <IosBadge>Assigned</IosBadge>
          </div>
          <dl className="mt-4 divide-y divide-border rounded-[8px] border border-border">
            {[["Pickup days", p.eta], ["On-time record", String(p.rating)], ["Monthly fee", money(p.charge)]].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="shrink-0 text-[13px] text-muted-foreground">{localize(l)}</dt>
                <dd className="min-w-0 truncate text-right text-[14px] font-semibold tabular-nums">{localize(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <IosEmpty icon={<Truck className="size-5" />} title={tr("No collector found")}>{tr("Go back and pick another address.")}</IosEmpty>
      )}
      <p className="mt-3 px-1 text-[13px] text-muted-foreground">{tr("One collector per street, by Lagos law. Unhappy later? Ask to switch from your profile.")}</p>
      <button type="button" onClick={() => setOthers(!others)} className="mt-4 min-h-[36px] px-1 text-[14px] font-medium text-foreground">
        {localize(others ? "Hide" : "See")}{" "}{tr("other collectors")}{" "}{localize(others ? "↑" : "↓")}
      </button>
      {others && (
        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {partners.filter((x) => x.id !== p?.id).map((x) => (
            <div key={x.id} className="flex items-center gap-3 rounded-[9px] border border-border bg-card p-3 opacity-70">
              <PartnerLogo partnerId={x.id} name={x.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-[14px]">{localize(x.name)}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">{tr("Other area")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="sticky bottom-4 mt-6 min-[480px]:bottom-6">
        <IosButton tone="ember" disabled={!p} onClick={() => p && choosePartner(p.id)}>{tr("Finish setup")}</IosButton>
      </div>
    </Phone>
  );
}

function Home() {
  const { t: tr, localize } = useLanguage();
  const { model, premise, partner, setStormForecast } = useStore();
  const hash = useRouterState({ select: (st) => st.location.hash });
  const [showSkips, setShowSkips] = useState(false);
  const [showDecal, setShowDecal] = useState(false);
  useEffect(() => { if (hash === "skips") setShowSkips(true); }, [hash]);

  const active = model.bins.some((b) => b.state === "Active");
  const open = model.pickups.find((p) => OPEN_PICKUP.includes(p.status));
  const compound = model.compound ?? createDefaultCompound();
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const sweep = model.corridorSweep;
  const storm = evaluateStormSurge(model.stormForecastMm ?? 64);
  const pendingCure = (model.remediations ?? []).filter((r) => r.status === "Awaiting Citizen Key").length;
  const isCommercial = premise?.id === "SHOP-150";
  const isCompound = premise?.id === "HOME-042";
  const myRoom = compound.rooms.find((x) => x.duid === compound.myRoomDuid);
  const roomsNeeded = Math.max(0, Math.ceil((quorum.totalRooms * compound.quorumThresholdPct) / 100) - quorum.paidCount);
  const circular = evaluateCircularSummary(
    model.recyclableDrops ?? defaultCircularDrops(),
    isCommercial ? 12500 : isCompound ? 750 : (partner?.charge ?? 1450),
  );

  const decal = buildMerchantDecal(
    premise?.id ?? "SHOP-150",
    isCommercial ? "Adeola Cold-Room & Plaza Ltd" : premise?.address ?? "Verified Premise",
    isCommercial ? 12500 : (partner?.charge ?? 1500),
    partner?.id ?? "PAR-016",
    sweep?.plate ?? "LND-482-KJA",
  );

  const forest = active;
  const title = !active
    ? "Activate your tracked compound drum."
    : open
      ? "Corridor sweep active."
      : storm.active
        ? "Pre-storm drainage protection active."
        : "Corridor sweep & compound ledger synced.";
  const to = !active ? "/bins" : "/activity";
  const action = !active ? "View smart bins & bags" : open ? "Track sweep & escrow" : "Open Dual-Key & Schedule";

  return (
    <Phone>
      <GameHub name={model.name.split(" ")[0] ?? ""} area={premise?.area ?? "Lagos"} />
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow truncate">
            {localize(isCompound ? `Cadastre ${compound.cadastreId} · Rm 02` : isCommercial ? "Commercial Window Decal" : "Statutory Residence")}
          </p>
          <p className="truncate text-[14px] font-semibold text-foreground">{premise?.address}</p>
        </div>
        <LinkStatus />
      </div>

      {sweep && (
        <Link to="/activity" aria-label={tr("Live truck {0}, ETA {1} minutes", sweep.truckId, sweep.etaMinutes)} className="live-truck mt-4 block rounded-3xl p-5 text-primary-foreground transition-transform active:scale-[0.99]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em]">
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>{tr("Live truck")}</span>
            {sweep.proximityAlertActive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[12px] font-extrabold text-primary-foreground">
                <Radio className="size-3.5" aria-hidden="true" />{" "}{tr("≤1.5km ping")}</span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0">
              <p className="truncate text-[20px] font-extrabold tracking-[-0.02em]">{localize(sweep.truckId)}</p>
              <p className="truncate text-[13px] text-primary-foreground/70">{localize(sweep.plate)} · {localize(sweep.crewName)}</p>
            </div>
            <div className="text-right">
              <p role="status" aria-live="polite" aria-atomic="true" className="text-[40px] font-extrabold leading-none tabular-nums"><span className="sr-only">{tr("Truck arriving in")}{" "}</span>{localize(sweep.etaMinutes)}<span className="text-[16px]">{" "}{tr("min")}</span></p>
              <p className="text-[12px] text-primary-foreground/70">{tr("ETA")}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[[`${sweep.distanceKm} km`, "Away"], [`${sweep.stopsBeforeYou}`, "Stops ahead"], [sweep.lastTelemetryAgo, "Telemetry"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-primary-foreground/10 px-2 py-2.5">
                <p className="truncate text-[15px] font-extrabold tabular-nums">{localize(v)}</p>
                <p className="text-[11px] text-primary-foreground/65">{localize(l)}</p>
              </div>
            ))}
          </div>
        </Link>
      )}

      {isCompound && (
        <section aria-labelledby="next-action" className="reminder-card mt-4 p-5">
          <div className="flex items-start gap-3">
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-[16px]", quorum.isQuarantined ? "bg-ember text-ember-foreground" : "bg-success text-primary-foreground")}>
              {quorum.isQuarantined ? <Lock className="size-6" aria-hidden="true" /> : <ShieldCheck className="size-6" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{tr("Next action ·")}{" "}{localize(compound.cadastreId)}</p>
              <h2 id="next-action" className="mt-0.5 text-[19px] font-extrabold leading-tight">
                {localize(myRoom?.paidThisMonth ? (quorum.isQuarantined ? "Use your Green Bag pass" : "You're all set") : `Pay ${money(myRoom?.monthlyShareNgn ?? 0)} for ${myRoom?.roomLabel ?? "your room"}`)}
              </h2>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[14px] font-extrabold">
              <span className="whitespace-nowrap">{localize(quorum.paidCount)}/{localize(quorum.totalRooms)}{" "}{tr("paid")}</span>
              <span className={quorum.isQuarantined ? "text-ember" : "text-success"}>{localize(quorum.isQuarantined ? "Drum locked" : "Drum open")}</span>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {compound.rooms.map((r) => (
                <span key={r.duid} className={cn("h-2.5 flex-1 rounded-full", r.paidThisMonth ? "bg-success" : r.duid === compound.myRoomDuid ? "bg-ember" : "bg-muted")} />
              ))}
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {localize(quorum.isQuarantined ? `${roomsNeeded} more room${roomsNeeded === 1 ? "" : "s"} to unlock the drum. Bag waste for now.` : "Drum open. Put waste out before the truck.")}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/bins" className="grid min-h-[50px] place-items-center rounded-full bg-foreground px-3 text-center text-[14px] font-extrabold text-background">{tr("Show pass")}</Link>
            <Link to="/wallet" className={cn("grid min-h-[50px] place-items-center rounded-full px-3 text-center text-[14px] font-extrabold", myRoom?.paidThisMonth ? "bg-muted text-foreground" : "bg-ember text-ember-foreground")}>
              {localize(myRoom?.paidThisMonth ? "Paid ✓" : "Pay share")}
            </Link>
          </div>
                  </section>
      )}

      {storm.active && (
        <section aria-label={tr("NiMet storm alert")} className="reminder-card mt-3 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-destructive text-destructive-foreground">
              <CloudRain className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-destructive">{tr("NiMet storm alert ·")}{" "}{localize(storm.forecastMm36h)}{tr("mm rain due")}</p>
              <h2 className="mt-0.5 text-[17px] font-extrabold leading-tight">{localize(storm.headline)}</h2>
                          </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={() => setShowSkips(true)} className="min-h-[50px] rounded-full bg-destructive px-4 text-[14px] font-extrabold text-destructive-foreground">{tr("Find a skip")}</button>
            <button type="button" onClick={() => setStormForecast(18)} className="min-h-[50px] rounded-full bg-muted px-4 text-[13px] font-bold text-foreground">{tr("Simulate dry")}</button>
          </div>
        </section>
      )}

      <div className={cn("relative mt-4 aspect-[6/5] overflow-hidden rounded-[20px]", forest ? "bg-primary" : "bg-ember")}>
        <img src={active ? collectionImg : deliveryImg} alt="" className="absolute inset-0 size-full object-cover" />
        <div className={cn("absolute inset-0", forest ? "hero-wash-forest" : "hero-wash-ember")} />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-90">
            {localize(open ? open.status : `${premise?.area} · Your assigned collector`)}
          </p>
          <h2 className="mt-1.5 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">{localize(title)}</h2>
          <p className="mt-1.5 text-[14px] leading-[19px] opacity-90">
            {partner?.name} · {sweep?.scheduleLabel ?? partner?.eta}
          </p>
          <Link to={to} className="mt-4 block">
            <Btn tone="light">{localize(action)}</Btn>
          </Link>
        </div>
      </div>

      <Link to="/wallet" className="ios-card mt-3 flex items-center justify-between gap-3 p-4 transition-transform active:scale-[0.99]">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-primary text-white">
            <Recycle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-primary">{tr("Circular Diversion · Trash-to-Cash")}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-foreground tabular-nums">
              {localize(circular.totalKg)}{" "}{tr("kg diverted · +")}{localize(money(circular.totalEarnedNgn))}{" "}{tr("earned")}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {localize(circular.co2SavedKg)}{" "}{tr("kg CO₂e avoided · Offsets")}{" "}{localize(circular.feeOffsetPct)}{tr("% of monthly fee")}</p>
          </div>
        </div>
        <IosBadge>{isCommercial && circular.eprCommercialRebateEligible ? "Paid" : "Active"}</IosBadge>
      </Link>

      <Link to="/wallet" className="wallet-balance mt-4 block transition-transform active:scale-[0.985]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75">
            {localize(isCompound ? "My Room Wallet · VACC-9042-02" : "Premise Virtual Wallet")}
          </p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-medium text-white">{tr("Wallet / POS ›")}</span>
        </div>
        <p className="mt-1.5 text-[32px] font-bold leading-tight tracking-tight tabular-nums">{localize(money(model.balance))}</p>
        {model.reserved > 0 && (
          <p className="mt-1 text-[13px] text-white/80 tabular-nums">{localize(money(model.reserved))}{" "}{tr("held in PSP escrow")}</p>
        )}
      </Link>

      <div className="mt-6 space-y-6">
        <IosSection header={tr("Street & Accountability Tools")}>
          <IosRow
            to="/activity"
            icon={<ShieldCheck className="size-4" />}
            iconTone={pendingCure > 0 ? "ember" : "forest"}
            title={tr("Dual-Key Remediation Closure")}
            subtitle={localize(pendingCure > 0 ? `${pendingCure} crew clearance awaits your confirmation` : "All site remediations verified")}
            trailing={pendingCure > 0 ? <IosBadge>Action</IosBadge> : undefined}
            disclosure
          />
          <IosRow
            to="/bins"
            icon={<Leaf className="size-4" />}
            iconTone="green"
            title={tr("Bins, 3-Stream Guide & QR Bags")}
            detail={tr("{0} drums", model.bins.length)}
            disclosure
          />
          <IosRow
            onClick={() => setShowDecal(true)}
            icon={<QrCode className="size-4" />}
            iconTone="blue"
            title={localize(isCommercial ? "Commercial Window QR Decal" : "Premise Anti-Extortion QR")}
            subtitle={tr("{0} · Zero cash on doorstep", decal.decalCode)}
            disclosure
          />
          {!storm.active && (
            <IosRow
              onClick={() => setStormForecast(64)}
              icon={<CloudRain className="size-4" />}
              iconTone="slate"
              title={tr("NiMet Flood Skip Locator")}
              subtitle={tr("Dry (18mm) · Tap to preview 64mm Flood Surge Skips")}
              disclosure
            />
          )}
          <IosRow
            to="/report"
            icon={<Mic className="size-4" />}
            iconTone="ember"
            title={tr("Voice Report & Whistleblower Vault")}
            subtitle={tr("Pidgin, Yorùbá, Igbo, Hausa · EXIF-scrubbed ₦10k tips")}
            disclosure
          />
          <IosRow
            to="/you"
            leading={<PartnerLogo partnerId={partner?.id} name={partner?.name} size="sm" />}
            title={tr("Statutory Ward PSP")}
            subtitle={localize(partner?.name)}
            disclosure
          />
        </IosSection>

        {model.notices.length > 0 && (
          <IosSection header={tr("Latest updates")}>
            {model.notices.slice(0, 4).map((n) => {
              const legal = /sec(tion)?\.?\s*\d|statutory|concession|franchise|tenancy|arrears|court|empl|enforcement|quorum|quarantin/i.test(n.text);
              const plain = !legal
                ? n.text
                : /court|enforcement/i.test(n.text)
                  ? `Check which room the letter names. Pay pending shares to reach ${compound.quorumThresholdPct}% and reopen the shared drum; ask LAWMA about any separate court restriction.`
                  : /tenancy|tenant/i.test(n.text)
                    ? "Update about old debts from a previous tenant. You don't pay those."
                    : /quorum|quarantin|arrears/i.test(n.text)
                      ? "Update about room payments and the shared drum. See Next action above."
                      : "Update about your assigned collector.";
              return (
                <div key={n.id} className="flex gap-3 px-4 py-3">
                  <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-[14px]">
                    <p className="font-medium text-foreground">{localize(plain)}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {localize(n.from === "lawma" ? "LAWMA" : n.from === "partner" ? "Partner" : "System")} · {localize(n.time)}
                    </p>
                    {legal && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[13px] font-semibold text-primary">{tr("Read full notice")}</summary>
                        <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted-foreground">{localize(n.text)}</p>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </IosSection>
        )}
      </div>

      <IosSheet open={showSkips} onClose={() => setShowSkips(false)} title={tr("Free 11m³ Emergency Skips")}>
        <div className="space-y-4 pt-1">
          <div className="rounded-[14px] bg-[#fef3f2] p-3 text-[13px] text-[#912018]">{tr("NiMet forecast is")}{" "}<strong>{localize(storm.forecastMm36h)}{tr("mm / 36h")}</strong>{tr(". Bag floatables and drop at any skip below at zero cost before street flooding begins.")}
          </div>
          <IosSection header={tr("Nearest LAWMA flood-response skips")}>
            {storm.skips.map((skip) => (
              <IosRow
                key={skip.id}
                icon={<Navigation className="size-4" />}
                iconTone="red"
                title={localize(skip.name)}
                subtitle={tr("{0} · {1}", skip.corridor, skip.capacityLabel)}
                detail={localize(skip.distanceLabel)}
              />
            ))}
          </IosSection>
          <IosButton tone="gray" onClick={() => setShowSkips(false)}>{tr("Close Skip Locator")}</IosButton>
        </div>
      </IosSheet>

      <IosSheet open={showDecal} onClose={() => setShowDecal(false)} title={tr("Holographic Window QR")}>
        <div className="space-y-4 pt-1">
          <div className="rounded-xl bg-ink p-4 text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">{tr("LAWMA Verified Premises Decal")}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{tr("SEC. 71 EMPL")}</span>
            </div>
            <p className="mt-2 text-[20px] font-bold tracking-tight">{decal.businessName}</p>
            <p className="mt-1 font-mono text-[13px] text-emerald-200">{localize(decal.decalCode)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[12px] bg-black/20 p-3 text-[12px]">
              <div>
                <p className="text-white/70">{tr("Statutory Rate")}</p>
                <p className="font-semibold text-white tabular-nums">{localize(money(decal.statutoryLevyNgn))} / mo</p>
              </div>
              <div>
                <p className="text-white/70">{tr("Authorized Truck")}</p>
                <p className="font-semibold text-white">{localize(decal.authorizedPlate)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[14px] bg-white p-3.5 text-[13px] text-foreground ring-1 ring-black/[0.06]">
            <p className="font-semibold text-primary">{tr("Anti-Extortion Proof")}</p>
            <p className="mt-1 text-muted-foreground">{localize(decal.noCashExtortionRule)}{tr(". Scan QR at shopfront to verify collector plate before loading.")}</p>
          </div>
          <IosButton tone="primary" onClick={() => setShowDecal(false)}>{tr("Done")}</IosButton>
        </div>
      </IosSheet>
    </Phone>
  );
}
