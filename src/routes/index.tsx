import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  CloudRain,
  Leaf,
  MapPin,
  Mic,
  Navigation,
  Package,
  QrCode,
  Radio,
  Recycle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { brandMark, Btn, LinkStatus, Phone } from "@/components/app";
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
  { img: dawnImg, eyebrow: "Corridor Telemetry", title: "No more waiting for the truck at dawn.", body: "Track your statutory ward truck corridor in real time with 1.5km arrival alerts." },
  { img: deliveryImg, eyebrow: "Smart bins & DUID bags", title: "Tracked bins & serialized bags.", body: "Your statutory Ward PSP services your compound drums and individual room bags." },
  { img: collectionImg, eyebrow: "Anonymous Protection", title: "Report dumping & extortion safely.", body: "Voice or EXIF-scrubbed whistleblower reports in Pidgin, Yorùbá, Igbo, Hausa & English." },
];

function Intro({ onDone }: { onDone: () => void }) {
  const { loadPresetDemo } = useStore();
  const [i, setI] = useState(0);
  const s = slides[i]!;
  const last = i === slides.length - 1;
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-primary text-primary-foreground">
      <div className="relative min-h-[240px] flex-1 overflow-hidden">
        <img key={s.img} src={s.img} alt="" className="absolute inset-0 size-full object-cover animate-in fade-in duration-500" />
        <div className="hero-wash-forest absolute inset-0" />
        <div className="absolute left-5 top-6 flex items-center gap-2.5 min-[480px]:top-14">
          <img src={brandMark} alt="" className="size-9 rounded-[10px] bg-white p-1 shadow-sm" />
          <img src={wordmark} alt="SmartWaste360" className="h-6" />
        </div>
        <div key={i} className="absolute inset-x-0 bottom-0 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-85">{s.eyebrow}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-[1.08] tracking-[-0.025em]">{s.title}</h1>
          <p className="mt-3 text-[15px] leading-[22px] opacity-90">{s.body}</p>
        </div>
      </div>
      <div className="space-y-3.5 px-5 pb-8 pt-5 min-[480px]:pb-9">
        <div className="flex justify-center gap-2" role="tablist" aria-label="Intro slides">
          {slides.map((_, n) => (
            <button
              key={n}
              type="button"
              aria-label={`Slide ${n + 1}`}
              onClick={() => setI(n)}
              className={cn(
                "h-2 rounded-full transition-all",
                n === i ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60",
              )}
            />
          ))}
        </div>
        {last ? (
          <IosButton tone="ember" onClick={onDone}>Get started</IosButton>
        ) : (
          <IosButton tone="light" onClick={() => setI(i + 1)}>Continue</IosButton>
        )}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {!last ? (
            <button
              type="button"
              onClick={onDone}
              className="min-h-[36px] px-2 text-[14px] font-medium text-white/85 hover:text-white"
            >
              Skip
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => loadPresetDemo("tenement")}
            className="min-h-[36px] rounded-full bg-white/15 px-3 text-[12px] font-semibold text-white hover:bg-white/25"
          >
            Quick Demo: 10-Room Compound
          </button>
        </div>
      </div>
    </div>
  );
}

function Steps({ n, title, sub }: { n: number; title: string; sub?: string | undefined }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <img src={brandMark} alt="SmartWaste360" className="size-9 rounded-[9px]" />
        <span className="text-[13px] font-semibold text-muted-foreground">Step {n} of 3</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((k) => (
          <span key={k} className={cn("h-1 rounded-full transition-colors", k <= n ? "bg-primary" : "bg-[#3c3c43]/15")} />
        ))}
      </div>
      <h1 className="mt-5 text-[34px] font-bold leading-[1.12] tracking-[-0.025em]">{title}</h1>
      {sub && <p className="mt-1.5 text-[15px] leading-[20px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Profile() {
  const { start } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Phone nav={false}>
      <Steps n={1} title="Tell us about you" sub="Set up your resident profile for waste pickups." />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && phone.trim()) start(name, phone);
        }}
      >
        <IosSection header="Contact details" footer="Your collection partner uses these details to reach you on arrival.">
          <IosField
            label="Full name"
            name="fullName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adaeze Okafor"
            required
            autoComplete="name"
            enterKeyHint="next"
          />
          <IosField
            label="Phone number"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 000 0000"
            inputMode="tel"
            required
            autoComplete="tel"
            enterKeyHint="done"
          />
        </IosSection>
        <IosButton type="submit" tone="ember" disabled={!name.trim() || !phone.trim()}>
          Continue
        </IosButton>
      </form>
    </Phone>
  );
}

function Address() {
  const { choosePremise } = useStore();
  const [q, setQ] = useState("");
  const list = premises.filter((p) => (p.address + p.area + p.detail).toLowerCase().includes(q.toLowerCase()));
  return (
    <Phone nav={false}>
      <Steps n={2} title="Bind your cadastre" sub="Select your address to resolve your statutory Sec. 71 Ward PSP." />
      <div className="mb-4">
        <IosSearchBar
          label="Search your street or area"
          value={q}
          onChange={setQ}
          placeholder="Search street or area (Ikeja, Yaba, Alimosho, VI)"
        />
      </div>
      {list.length === 0 ? (
        <IosEmpty icon={<MapPin className="size-5" />} title="No address match">
          Try searching for Ikeja, Yaba, Ajah, Victoria Island, or Alimosho.
        </IosEmpty>
      ) : (
        <IosSection header="LASG cadastre rollout premises">
          {list.map((p) => (
            <IosRow
              key={p.id}
              onClick={() => choosePremise(p.id)}
              icon={<MapPin className="size-4" />}
              iconTone="forest"
              title={`${p.address}, ${p.area}`}
              subtitle={p.detail}
              disclosure
            />
          ))}
        </IosSection>
      )}
    </Phone>
  );
}

function ChoosePartner() {
  const { choosePartner, premise, statutoryPartner } = useStore();
  const [pick, setPick] = useState("");
  useEffect(() => {
    if (!pick && statutoryPartner?.id) {
      setPick(statutoryPartner.id);
    }
  }, [pick, statutoryPartner?.id]);
  const chosenId = pick || statutoryPartner?.id || "";
  return (
    <Phone nav={false}>
      <Steps
        n={3}
        title="Statutory Ward PSP"
        sub={`Under Sec. 71 Lagos EMPL 2017, ${premise?.address} is served by an exclusive Ward PSP concession.`}
      />

      {statutoryPartner && (
        <div className="mb-4 rounded-[14px] border border-[#17593a]/25 bg-[#e8f3ec] p-3.5 text-[13px] text-[#12472e]">
          <p className="font-semibold">Exclusive Concession Assigned: {statutoryPartner.name}</p>
          <p className="mt-0.5 text-[12px] opacity-85">
            {statutoryPartner.area} · {statutoryPartner.eta}. To report SLA failure or petition transfer later, use You → SLA Escalation.
          </p>
        </div>
      )}

      <IosSection header="Ward PSP registry">
        {partners.map((p) => (
          <IosRow
            key={p.id}
            onClick={() => setPick(p.id)}
            leading={<PartnerLogo partnerId={p.id} name={p.name} size="md" />}
            title={p.name}
            subtitle={`${p.area} · ${p.rating} · ${p.eta}`}
            detail={money(p.charge)}
            trailing={p.id === statutoryPartner?.id ? <IosBadge>Statutory</IosBadge> : undefined}
            selected={chosenId === p.id}
          />
        ))}
      </IosSection>
      <div className="sticky bottom-4 mt-5 min-[480px]:bottom-6">
        <IosButton tone="primary" disabled={!chosenId} onClick={() => choosePartner(chosenId)}>
          Bind Ward PSP Franchise
        </IosButton>
      </div>
    </Phone>
  );
}

function Home() {
  const { model, premise, partner, loadPresetDemo, setStormForecast } = useStore();
  const [showSkips, setShowSkips] = useState(false);
  const [showDecal, setShowDecal] = useState(false);

  const active = model.bins.some((b) => b.state === "Active");
  const open = model.pickups.find((p) => OPEN_PICKUP.includes(p.status));
  const compound = model.compound ?? createDefaultCompound();
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const sweep = model.corridorSweep;
  const storm = evaluateStormSurge(model.stormForecastMm ?? 64);
  const pendingCure = (model.remediations ?? []).filter((r) => r.status === "Awaiting Citizen Key").length;
  const isCommercial = premise?.id === "SHOP-150";
  const isCompound = premise?.id === "HOME-042";
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {isCompound ? `Cadastre ${compound.cadastreId} · Rm 02` : isCommercial ? "Commercial Window Decal" : "Statutory Residence"}
          </p>
          <p className="truncate text-[14px] font-medium text-foreground">{premise?.address}</p>
        </div>
        <LinkStatus />
      </div>

      <h1 className="mt-3 text-[34px] font-bold leading-[1.12] tracking-[-0.025em]">
        Hello, {model.name.split(" ")[0]}.
      </h1>

      <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Quick scenario presets">
        <button
          type="button"
          onClick={() => loadPresetDemo("tenement")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            isCompound ? "bg-[#17593a] text-white" : "bg-[#e5e5ea] text-[#3c3c43] hover:bg-[#d8d8de]",
          )}
        >
          10-Room Compound
        </button>
        <button
          type="button"
          onClick={() => loadPresetDemo("commercial")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            isCommercial ? "bg-[#17593a] text-white" : "bg-[#e5e5ea] text-[#3c3c43] hover:bg-[#d8d8de]",
          )}
        >
          VI Shop Decal
        </button>
        <button
          type="button"
          onClick={() => loadPresetDemo("residential")}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            premise?.id === "HOME-018" ? "bg-[#17593a] text-white" : "bg-[#e5e5ea] text-[#3c3c43] hover:bg-[#d8d8de]",
          )}
        >
          Ikeja Flat
        </button>
      </div>

      {storm.active && (
        <div className="mt-3.5 rounded-[16px] border border-[#d92d20]/30 bg-[#fef3f2] p-3.5 text-[#912018]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <CloudRain className="mt-0.5 size-5 shrink-0 text-[#d92d20]" aria-hidden="true" />
              <div>
                <p className="text-[13px] font-bold leading-snug">{storm.headline}</p>
                <p className="mt-0.5 text-[12px] leading-snug opacity-90">{storm.advisory}</p>
              </div>
            </div>
            <IosBadge>Surge Alert</IosBadge>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSkips(true)}
              className="rounded-full bg-[#d92d20] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#b42318]"
            >
              Find Free 11m³ Skip
            </button>
            <button
              type="button"
              onClick={() => setStormForecast(18)}
              className="rounded-full bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-[#7a271a] ring-1 ring-[#d92d20]/20"
            >
              Simulate Dry (18mm)
            </button>
          </div>
        </div>
      )}

      <div className={cn("relative mt-4 aspect-[6/5] overflow-hidden rounded-[20px]", forest ? "bg-primary" : "bg-ember")}>
        <img src={active ? collectionImg : deliveryImg} alt="" className="absolute inset-0 size-full object-cover" />
        <div className={cn("absolute inset-0", forest ? "hero-wash-forest" : "hero-wash-ember")} />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-90">
            {open ? open.status : `${premise?.area} · Sec. 71 Ward Franchise`}
          </p>
          <h2 className="mt-1.5 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">{title}</h2>
          <p className="mt-1.5 text-[14px] leading-[19px] opacity-90">
            {partner?.name} · {sweep?.scheduleLabel ?? partner?.eta}
          </p>
          <Link to={to} className="mt-4 block">
            <Btn tone="light">{action}</Btn>
          </Link>
        </div>
      </div>

      {sweep && (
        <div className="ios-card mt-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#17593a]/12 text-[#17593a]">
                <Truck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[15px] font-semibold text-foreground">{sweep.truckId} · {sweep.plate}</p>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {sweep.distanceKm} km away · ETA {sweep.etaMinutes} mins ({sweep.stopsBeforeYou} stops ahead)
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{sweep.crewName} · Telemetry {sweep.lastTelemetryAgo}</p>
              </div>
            </div>
            {sweep.proximityAlertActive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#248a3d]/12 px-2.5 py-1 text-[11px] font-semibold text-[#17682c]">
                <Radio className="size-3" aria-hidden="true" />
                ≤1.5km Ping
              </span>
            )}
          </div>
        </div>
      )}

      {isCompound && (
        <Link to="/wallet" className="ios-card mt-3 flex items-center justify-between gap-3 p-4 transition-transform active:scale-[0.99]">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Compound Quorum · {quorum.paidCount}/{quorum.totalRooms} Rooms Paid ({quorum.quorumPct}%)
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-foreground">
              {quorum.isQuarantined
                ? "Communal drum locked (<60%). Use My Green Bags QR or settle 1 room."
                : "60%+ quorum met — communal compound drum unlocked."}
            </p>
          </div>
          <IosBadge>{quorum.isQuarantined ? "Quarantined" : "Open"}</IosBadge>
        </Link>
      )}

      <Link to="/wallet" className="ios-card mt-3 flex items-center justify-between gap-3 p-4 transition-transform active:scale-[0.99]">
        <div className="flex items-start gap-3 min-w-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#17593a] text-white">
            <Recycle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#17593a]">
              Circular Diversion · Trash-to-Cash
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-foreground tabular-nums">
              {circular.totalKg} kg diverted · +{money(circular.totalEarnedNgn)} earned
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {circular.co2SavedKg} kg CO₂e avoided · Offsets {circular.feeOffsetPct}% of monthly fee
            </p>
          </div>
        </div>
        <IosBadge>{isCommercial && circular.eprCommercialRebateEligible ? "Paid" : "Active"}</IosBadge>
      </Link>

      <Link to="/wallet" className="wallet-balance mt-4 block transition-transform active:scale-[0.985]">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75">
            {isCompound ? "My Room Wallet · VACC-9042-02" : "Premise Virtual Wallet"}
          </p>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-medium text-white">Wallet / POS ›</span>
        </div>
        <p className="mt-1.5 text-[32px] font-bold leading-tight tracking-tight tabular-nums">{money(model.balance)}</p>
        {model.reserved > 0 && (
          <p className="mt-1 text-[13px] text-white/80 tabular-nums">{money(model.reserved)} held in PSP escrow</p>
        )}
      </Link>

      <div className="mt-6 space-y-6">
        <IosSection header="Street & Accountability Tools">
          <IosRow
            to="/activity"
            icon={<ShieldCheck className="size-4" />}
            iconTone={pendingCure > 0 ? "ember" : "forest"}
            title="Dual-Key Remediation Closure"
            subtitle={pendingCure > 0 ? `${pendingCure} crew clearance awaits your confirmation` : "All site remediations verified"}
            trailing={pendingCure > 0 ? <IosBadge>Action</IosBadge> : undefined}
            disclosure
          />
          <IosRow
            to="/bins"
            icon={<Leaf className="size-4" />}
            iconTone="green"
            title="Bins, 3-Stream Guide & QR Bags"
            detail={`${model.bins.length} drums`}
            disclosure
          />
          <IosRow
            onClick={() => setShowDecal(true)}
            icon={<QrCode className="size-4" />}
            iconTone="blue"
            title={isCommercial ? "Commercial Window QR Decal" : "Premise Anti-Extortion QR"}
            subtitle={`${decal.decalCode} · Zero cash on doorstep`}
            disclosure
          />
          {!storm.active && (
            <IosRow
              onClick={() => setStormForecast(64)}
              icon={<CloudRain className="size-4" />}
              iconTone="slate"
              title="NiMet Flood Skip Locator"
              subtitle="Dry (18mm) · Tap to preview 64mm Flood Surge Skips"
              disclosure
            />
          )}
          <IosRow
            to="/report"
            icon={<Mic className="size-4" />}
            iconTone="ember"
            title="Voice Report & Whistleblower Vault"
            subtitle="Pidgin, Yorùbá, Igbo, Hausa · EXIF-scrubbed ₦10k tips"
            disclosure
          />
          <IosRow
            to="/you"
            leading={<PartnerLogo partnerId={partner?.id} name={partner?.name} size="sm" />}
            title="Statutory Ward PSP"
            subtitle={partner?.name}
            disclosure
          />
        </IosSection>

        {model.notices.length > 0 && (
          <IosSection header="Latest updates">
            {model.notices.slice(0, 4).map((n) => (
              <IosRow
                key={n.id}
                icon={<Bell className="size-4" />}
                iconTone={n.from === "lawma" ? "blue" : n.from === "partner" ? "green" : "slate"}
                title={n.text}
                subtitle={`${n.from === "lawma" ? "LAWMA" : n.from === "partner" ? "Partner" : "System"} · ${n.time}`}
                trailing={<IosBadge>{n.from === "app" ? "Updated" : "Notice"}</IosBadge>}
              />
            ))}
          </IosSection>
        )}
      </div>

      <IosSheet open={showSkips} onClose={() => setShowSkips(false)} title="Free 11m³ Emergency Skips">
        <div className="space-y-4 pt-1">
          <div className="rounded-[14px] bg-[#fef3f2] p-3 text-[13px] text-[#912018]">
            NiMet forecast is <strong>{storm.forecastMm36h}mm / 36h</strong>. Bag floatables and drop at any skip below at zero cost before street flooding begins.
          </div>
          <IosSection header="Nearest LAWMA flood-response skips">
            {storm.skips.map((skip) => (
              <IosRow
                key={skip.id}
                icon={<Navigation className="size-4" />}
                iconTone="red"
                title={skip.name}
                subtitle={`${skip.corridor} · ${skip.capacityLabel}`}
                detail={skip.distanceLabel}
              />
            ))}
          </IosSection>
          <IosButton tone="gray" onClick={() => setShowSkips(false)}>
            Close Skip Locator
          </IosButton>
        </div>
      </IosSheet>

      <IosSheet open={showDecal} onClose={() => setShowDecal(false)} title="Holographic Window QR">
        <div className="space-y-4 pt-1">
          <div className="rounded-[18px] bg-gradient-to-br from-[#17593a] to-[#0f3f29] p-4 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">LAWMA Verified Premises Decal</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">SEC. 71 EMPL</span>
            </div>
            <p className="mt-2 text-[20px] font-bold tracking-tight">{decal.businessName}</p>
            <p className="mt-1 font-mono text-[13px] text-emerald-200">{decal.decalCode}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-[12px] bg-black/20 p-3 text-[12px]">
              <div>
                <p className="text-white/70">Statutory Rate</p>
                <p className="font-semibold text-white tabular-nums">{money(decal.statutoryLevyNgn)} / mo</p>
              </div>
              <div>
                <p className="text-white/70">Authorized Truck</p>
                <p className="font-semibold text-white">{decal.authorizedPlate}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[14px] bg-white p-3.5 text-[13px] text-foreground ring-1 ring-black/[0.06]">
            <p className="font-semibold text-[#17593a]">Anti-Extortion Proof</p>
            <p className="mt-1 text-muted-foreground">{decal.noCashExtortionRule}. Scan QR at shopfront to verify collector plate before loading.</p>
          </div>
          <IosButton tone="primary" onClick={() => setShowDecal(false)}>Done</IosButton>
        </div>
      </IosSheet>
    </Phone>
  );
}
