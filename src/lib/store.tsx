import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppName } from "./hub-contract";
import {
  blankModel, defaultCorridorSweep, defaultRemediations, money, newId, OPEN_PICKUP, partners, premises, stamp,
  type Model, type Notice,
} from "./customer-model";
import {
  applyTenancySec44Reset,
  corridorScheduleFor,
  createDefaultCompound,
  createWhistleblowerSubmission,
  defaultCircularDrops,
  generateKioskVoucher,
  recordCircularDrop,
  resolveCitizenRemediation,
  resolveStatutoryPartner,
  settleCompoundRoom,
  settlePendingRooms,
  type KioskProvider,
  type KioskVoucher,
  type MaterialType,
  type RecyclableDrop,
  type BagHandoff,
  verifyBagHandoff,
  type WhistleblowerTicket,
} from "./resident-ops";

type Link = "demo" | "connecting" | "connected" | "offline";

const MODEL_KEY = "lawma-customer-demo-v2";
const INTRO_KEY = "lawma-customer-intro-v2";

type Store = {
  introDone: boolean;
  completeIntro: () => void;
  isOnboarded: boolean;
  model: Model;
  ready: boolean;
  link: Link;
  premise?: (typeof premises)[number] | undefined;
  partner?: (typeof partners)[number] | undefined;
  statutoryPartner?: (typeof partners)[number] | undefined;
  start: (name: string, phone: string) => void;
  choosePremise: (id: string) => void;
  choosePartner: (id: string) => void;
  requestProviderChange: (id: string) => string | null;
  requestBins: (size: number, qty: number) => void;
  topUp: (amount: number, method: string) => void;
  requestPickup: (window: string) => string | null;
  cancelPickup: (id: string) => void;
  report: (type: string, detail: string, to: AppName[], extra?: { title?: string; urgency?: string; original?: string }) => string;
  settleRoom: (duid: string) => void;
  settleCompound: () => void;
  applySec44Shield: (duid: string, incomingName: string) => void;
  createPosVoucher: (provider: KioskProvider, roomDuid: string, amountNgn: number) => KioskVoucher;
  resolveRemediation: (id: string, action: "confirm" | "dispute", note?: string, counterPhoto?: boolean) => string | null;
  setStormForecast: (mm36h: number) => void;
  submitWhistleblower: (category: string, corridor: string) => WhistleblowerTicket;
  logCircularDrop: (hubId: string, materialId: MaterialType, weightKg: number, cleanSort: boolean) => RecyclableDrop;
  recordBagHandoff: (scannedCode: string, bags: number) => BagHandoff | null;
  loadPresetDemo: (preset: "tenement" | "commercial" | "residential") => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<Model>(() => blankModel(""));
  const [introDone, setIntroDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState<Link>("connecting");
  const latest = useRef(model);
  latest.current = model;

  // Login-free presentation mode: onboarding and all resident changes stay on this device.
  useEffect(() => {
    const initial = { ...blankModel("CUS-DEMO-LOCAL"), balance: 7500 };
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      const parsed = saved ? { ...initial, ...JSON.parse(saved) } : initial;
      setModel(parsed);
      const seen = localStorage.getItem(INTRO_KEY) === "1" || Boolean(parsed.name && parsed.premiseId && parsed.partnerId);
      setIntroDone(seen);
    } catch {
      setModel(initial);
      setIntroDone(false);
    }
    setReady(true);
    setLink("demo");
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(MODEL_KEY, JSON.stringify(model)); } catch { /* Storage may be unavailable in private browsing. */ } }
  }, [model, ready]);
  const send = useCallback((_to: AppName[], _type: string, _payload: Record<string, unknown>, _ref?: string) => { setLink("demo"); }, []);

  const notice = (s: Model, text: string): Notice[] => [{ id: newId("N"), text, time: stamp(), from: "app" as const }, ...s.notices].slice(0, 30);

  const store = useMemo<Store>(() => {
    const premise = premises.find((p) => p.id === model.premiseId);
    const partner = partners.find((p) => p.id === model.partnerId);
    const statutoryPartnerId = model.premiseId ? resolveStatutoryPartner(model.premiseId) : undefined;
    const statutoryPartner = statutoryPartnerId ? partners.find((p) => p.id === statutoryPartnerId) : undefined;
    const isOnboarded = Boolean(introDone && model.name && model.premiseId && model.partnerId);
    return {
      introDone,
      completeIntro() {
        setIntroDone(true);
        try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }
      },
      isOnboarded,
      model, ready, link, premise, partner, statutoryPartner,
      start(name, phone) {
        setModel((s) => ({ ...s, name: name.trim(), phone: phone.trim() }));
        setTimeout(() => send(["lawma"], "customer.registered", {}), 0);
      },
      choosePremise(id) {
        const shared =
          id === "HOME-042"
            ? [{ id: "BIN-1042", size: 240, state: "Active" as const }, { id: "BIN-1043", size: 240, state: "Active" as const }]
            : id === "SHOP-150"
              ? [{ id: "BIN-2150", size: 360, state: "Active" as const }]
              : [];
        const wardPartnerId = resolveStatutoryPartner(id);
        const wardPartner = partners.find((p) => p.id === wardPartnerId);
        const sweepBase = model.corridorSweep ?? defaultCorridorSweep();
        setModel((s) => ({
          ...s,
          premiseId: id,
          partnerId: "",
          bins: shared,
          corridorSweep: {
            ...sweepBase,
            corridor: wardPartner?.area ?? sweepBase.corridor,
            scheduleLabel: corridorScheduleFor(wardPartnerId),
          },
          notices: notice(s, `Premise confirmed. Statutory Ward Franchise under Sec. 71 EMPL: ${wardPartner?.name ?? wardPartnerId}.`),
        }));
      },
      choosePartner(id) {
        const p = partners.find((x) => x.id === id);
        if (!p) return;
        setModel((s) => ({
          ...s,
          partnerId: id,
          corridorSweep: {
            ...(s.corridorSweep ?? defaultCorridorSweep()),
            corridor: p.area,
            scheduleLabel: corridorScheduleFor(id),
          },
          notices: notice(s, `${p.name} bound as your Ward PSP under Sec. 71 EMPL 2017.`),
        }));
        setTimeout(() => send(["partner", "lawma"], "partner.selected", { partnerId: id, partnerName: p.name }), 0);
      },
      requestProviderChange(id) {
        const m = latest.current;
        if (m.pickups.some((x) => OPEN_PICKUP.includes(x.status))) return "Finish your current pickup before changing partners.";
        if (m.partnerId === id) return "This is already your partner.";
        if (m.pendingPartnerId) return "A change request is already with LAWMA.";
        const p = partners.find((x) => x.id === id);
        setModel((s) => ({ ...s, pendingPartnerId: id, notices: notice(s, `SLA Transfer Petition to ${p?.name} sent to LAWMA Compliance.`) }));
        send(["lawma", "partner"], "provider_change.requested", { fromPartnerId: m.partnerId, toPartnerId: id, toPartnerName: p?.name });
        return null;
      },
      requestBins(size, qty) {
        const bins = Array.from({ length: qty }, () => ({ id: newId("BIN"), size, state: "Requested" as const }));
        setModel((s) => ({ ...s, bins: [...s.bins, ...bins], notices: notice(s, `${qty} × ${size}L bin request sent to your partner.`) }));
        bins.forEach((b) => send(["partner"], "bin.requested", { binId: b.id, size, kind: latest.current.bins.length ? "additional" : "new" }, b.id));
      },
      topUp(amount, method) {
        setModel((s) => ({ ...s, balance: s.balance + amount, entries: [{ id: newId("TX"), title: `Added via ${method}`, amount, time: stamp(), kind: "credit" as const }, ...s.entries], notices: notice(s, `${money(amount)} added to your wallet.`) }));
        send(["partner", "lawma"], "wallet.topup", { amount, method, balance: latest.current.balance + amount });
      },
      requestPickup(window) {
        const m = latest.current;
        const p = partners.find((x) => x.id === m.partnerId);
        if (!p) return "Choose a partner first.";
        if (m.pickups.some((x) => OPEN_PICKUP.includes(x.status))) return "You already have a pickup in progress.";
        if (m.balance < p.charge) return `Add at least ${money(p.charge - m.balance)} to your wallet first.`;
        const pickup = { id: newId("PU"), status: "Requested" as const, amount: p.charge, created: stamp(), window, partner: p.name, history: [{ status: "Requested", time: stamp() }] };
        setModel((s) => ({ ...s, balance: s.balance - p.charge, reserved: s.reserved + p.charge, pickups: [pickup, ...s.pickups],
          entries: [{ id: newId("TX"), title: `Held for pickup ${pickup.id}`, amount: p.charge, time: stamp(), kind: "reserved" as const }, ...s.entries],
          notices: notice(s, `Corridor sweep request sent to ${p.name}.`) }));
        send(["partner"], "pickup.requested", { pickupId: pickup.id, amount: p.charge, window, partnerId: p.id }, pickup.id);
        return null;
      },
      cancelPickup(id) {
        const pk = latest.current.pickups.find((x) => x.id === id);
        if (!pk || pk.status !== "Requested") return;
        setModel((s) => ({ ...s, balance: s.balance + pk.amount, reserved: Math.max(0, s.reserved - pk.amount),
          pickups: s.pickups.map((x) => x.id === id ? { ...x, status: "Cancelled" as const, history: [...x.history, { status: "Cancelled", time: stamp() }] } : x),
          entries: [{ id: newId("TX"), title: `Pickup ${id} cancelled`, amount: pk.amount, time: stamp(), kind: "released" as const }, ...s.entries] }));
        send(["partner"], "pickup.cancelled", { pickupId: id }, id);
      },
      report(type, detail, to, extra = {}) {
        const id = newId("CASE");
        setModel((s) => ({ ...s, issues: [{ id, type, detail, status: "Open" as const, time: stamp() }, ...s.issues], notices: notice(s, `Case ${id} sent.`) }));
        send(to, "issue.reported", { issueId: id, type, detail, ...extra }, id);
        return id;
      },
      settleRoom(duid) {
        setModel((s) => {
          const compound = s.compound ?? createDefaultCompound();
          const room = compound.rooms.find((r) => r.duid === duid);
          if (!room || room.paidThisMonth || s.balance < room.monthlyShareNgn) return s;
          const nextRooms = settleCompoundRoom(compound.rooms, duid);
          const debit = Math.min(s.balance, room.monthlyShareNgn);
          return {
            ...s,
            balance: Math.max(0, s.balance - debit),
            compound: { ...compound, rooms: nextRooms },
            entries: [
              { id: newId("TX"), title: `Room share settled (${room.roomLabel})`, amount: room.monthlyShareNgn, time: stamp(), kind: "paid" },
              ...s.entries,
            ],
            notices: notice(s, `${room.roomLabel} (${duid}) settled. Compound quorum recalculated.`),
          };
        });
      },
      settleCompound() {
        setModel((s) => {
          const compound = s.compound ?? createDefaultCompound();
          const result = settlePendingRooms(compound.rooms, s.balance);
          if (!result) return s;
          return {
            ...s,
            balance: result.balance,
            compound: { ...compound, rooms: result.rooms },
            entries: [{ id: newId("TX"), title: `Compound settled (${result.settledDuids.length} rooms)`, amount: result.debit, time: stamp(), kind: "paid" }, ...s.entries],
            notices: notice(s, `${result.settledDuids.length} pending rooms settled together. Shared drum open.`),
          };
        });
      },
      applySec44Shield(duid, incomingName) {
        setModel((s) => {
          const compound = s.compound ?? createDefaultCompound();
          const nextRooms = applyTenancySec44Reset(compound.rooms, duid, incomingName);
          return {
            ...s,
            compound: { ...compound, rooms: nextRooms, tenancyShieldActive: true },
            notices: notice(s, `Tenancy Law Sec. 44 Shield applied to ${duid}. Prior tenant arrears cleared.`),
          };
        });
      },
      createPosVoucher(provider, roomDuid, amountNgn) {
        const voucher = generateKioskVoucher(provider, roomDuid, amountNgn);
        setModel((s) => ({
          ...s,
          kioskVouchers: [voucher, ...(s.kioskVouchers ?? [])].slice(0, 10),
          notices: notice(s, `Cash voucher ${voucher.code} issued for ${provider} agent (${money(amountNgn)}).`),
        }));
        return voucher;
      },
      resolveRemediation(id, action, note, counterPhoto = false) {
        const list = latest.current.remediations ?? defaultRemediations();
        const target = list.find((r) => r.id === id);
        if (!target) return "Remediation case not found.";
        try {
          const updated = resolveCitizenRemediation(target, action, note, counterPhoto);
          setModel((s) => ({
            ...s,
            remediations: (s.remediations ?? defaultRemediations()).map((r) => (r.id === id ? updated : r)),
            notices: notice(
              s,
              action === "confirm"
                ? `Dual-Key Confirmed for ${id}. ${money(target.escrowAmountNgn)} PSP escrow unlocked.`
                : `Dual-Key Disputed for ${id}. PSP escrow frozen and routed to Zonal Supervisor.`,
            ),
          }));
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Could not update remediation case.";
        }
      },
      setStormForecast(mm36h) {
        setModel((s) => ({
          ...s,
          stormForecastMm: mm36h,
          notices: notice(
            s,
            mm36h >= 50
              ? `NiMet Flood Alert (${mm36h}mm/36h): Free 11 m³ Emergency Skips opened near your corridor.`
              : `NiMet corridor forecast updated to ${mm36h}mm/36h (Dry Clearance Window).`,
          ),
        }));
      },
      submitWhistleblower(category, corridor) {
        const ticket = createWhistleblowerSubmission(category, corridor, latest.current.phone);
        setModel((s) => ({
          ...s,
          whistleblowerTickets: [ticket, ...(s.whistleblowerTickets ?? [])],
          notices: notice(s, `Anonymous tip ${ticket.id} sealed (EXIF stripped · ₦10,000 blind bounty queued).`),
        }));
        return ticket;
      },
      logCircularDrop(hubId, materialId, weightKg, cleanSort) {
        const drop = recordCircularDrop(hubId, materialId, weightKg, cleanSort, stamp());
        setModel((s) => {
          const currentDrops = s.recyclableDrops ?? defaultCircularDrops();
          return {
            ...s,
            balance: s.balance + drop.earnedNgn,
            recyclableDrops: [drop, ...currentDrops],
            entries: drop.earnedNgn > 0
              ? [
                  {
                    id: newId("TX"),
                    title: `Trash-to-Cash (${drop.weightKg}kg ${drop.materialId})`,
                    amount: drop.earnedNgn,
                    time: stamp(),
                    kind: "credit",
                  },
                  ...s.entries,
                ]
              : s.entries,
            notices: notice(
              s,
              cleanSort
                ? `Circular credit: +${money(drop.earnedNgn)} for ${drop.weightKg}kg ${drop.materialId} (${drop.co2SavedKg}kg CO₂ saved).`
                : `Contaminated drop logged (${drop.weightKg}kg ${drop.materialId}): rinse/sort clean for ₦ buy-back.`,
            ),
          };
        });
        return drop;
      },
      recordBagHandoff(scannedCode, bags) {
        const m = latest.current;
        const compound = m.compound;
        const room = compound?.rooms.find((r) => r.duid === compound.myRoomDuid);
        if (!room) return null;
        const res = verifyBagHandoff(scannedCode, room, bags);
        const h: BagHandoff = {
          id: newId("HANDOFF"), scannedCode: scannedCode.trim().toUpperCase(), roomDuid: room.duid, roomLabel: room.roomLabel, bags,
          crew: m.corridorSweep?.crewName ?? "Collection crew", truckId: m.corridorSweep?.truckId ?? "Truck",
          status: res.status, reason: res.reason, at: stamp(),
        };
        setModel((s) => ({ ...s, bagHandoffs: [h, ...(s.bagHandoffs ?? [])].slice(0, 30),
          notices: notice(s, res.status === "Verified" ? `Bag collection verified: ${res.reason}` : `Bag scan not accepted: ${res.reason}`) }));
        return h;
      },
      loadPresetDemo(preset) {
        const map = {
          tenement: {
            name: "Kemi Adeyemi",
            phone: "0803 451 8820",
            premiseId: "HOME-042",
            partnerId: "PAR-006",
            bins: [{ id: "BIN-1042", size: 240, state: "Active" as const }, { id: "BIN-1043", size: 240, state: "Active" as const }],
            storm: 64,
            msg: "Loaded 10-Room Mainland Court Compound (Quorum Quarantine & Storm Surge Demo).",
          },
          commercial: {
            name: "Chidi Nwankwo · ColdRoom Ltd",
            phone: "0809 221 0410",
            premiseId: "SHOP-150",
            partnerId: "PAR-016",
            bins: [{ id: "BIN-2150", size: 360, state: "Active" as const }],
            storm: 22,
            msg: "Loaded Victoria Island Commercial Plaza (Holographic Window QR Decal Demo).",
          },
          residential: {
            name: "Adaeze Okafor",
            phone: "0803 000 0000",
            premiseId: "HOME-018",
            partnerId: "PAR-001",
            bins: [{ id: "BIN-1801", size: 240, state: "Active" as const }],
            storm: 18,
            msg: "Loaded Ikeja GRA Flat (Statutory Ward PSP Franchise Demo).",
          },
        }[preset];
        setIntroDone(true);
        try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* ignore */ }
        setModel((s) => ({
          ...blankModel(s.customerId || "CUS-DEMO-LOCAL"),
          balance: 7500,
          name: map.name,
          phone: map.phone,
          premiseId: map.premiseId,
          partnerId: map.partnerId,
          bins: map.bins,
          stormForecastMm: map.storm,
          corridorSweep: {
            ...defaultCorridorSweep(),
            corridor: partners.find((p) => p.id === map.partnerId)?.area ?? "Lagos Corridor",
            scheduleLabel: corridorScheduleFor(map.partnerId),
          },
          notices: notice(s, map.msg),
        }));
      },
      reset() {
        setModel((s) => ({ ...blankModel(s.customerId), balance: 7500 }));
        setIntroDone(false);
        try {
          localStorage.removeItem(INTRO_KEY);
          localStorage.removeItem(MODEL_KEY);
          ["lawma-report-draft-v1", "lawma-address-correction", "lawma-case-opened", "lawma-claimed-milestones-v1"].forEach((key) => localStorage.removeItem(key));
        } catch { /* ignore */ }
      },
    };
  }, [introDone, model, ready, link, send]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
