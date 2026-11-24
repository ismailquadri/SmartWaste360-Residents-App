import type { HubMessage } from "./hub-contract";
import {
  createDefaultCompound,
  defaultCircularDrops,
  type CompoundState,
  type CorridorSweep,
  type KioskVoucher,
  type RecyclableDrop,
  type BagHandoff,
  type RemediationCase,
  type WhistleblowerTicket,
} from "./resident-ops";

export type Partner = { id: string; name: string; area: string; eta: string; charge: number; capacity: string; rating: string };
export type Premise = { id: string; address: string; area: string; detail: string };
export type BinState = "Requested" | "Approved" | "Out for delivery" | "Delivered" | "Active" | "Declined";
export type Bin = { id: string; size: number; state: BinState };
export type PickupStatus = "Requested" | "Accepted" | "Scheduled" | "Collected" | "Completed" | "Declined" | "Cancelled";
export type Pickup = { id: string; status: PickupStatus; amount: number; created: string; window: string; partner: string; crew?: string | undefined; history: { status: string; time: string; note?: string | undefined }[] };
export type Entry = { id: string; title: string; amount: number; time: string; kind: "credit" | "reserved" | "paid" | "released" };
export type Issue = { id: string; type: string; detail: string; status: "Open" | "In review" | "Resolved"; time: string; reply?: string | undefined; from?: string | undefined };
export type Notice = { id: string; text: string; time: string; from: "partner" | "lawma" | "app" };

export type Model = {
  customerId: string;
  name: string;
  phone: string;
  premiseId: string;
  partnerId: string;
  pendingPartnerId: string;
  bins: Bin[];
  balance: number;
  reserved: number;
  pickups: Pickup[];
  entries: Entry[];
  issues: Issue[];
  notices: Notice[];
  cursor: string;
  seen: string[];
  compound?: CompoundState | undefined;
  corridorSweep?: CorridorSweep | undefined;
  stormForecastMm?: number | undefined;
  remediations?: RemediationCase[] | undefined;
  kioskVouchers?: KioskVoucher[] | undefined;
  whistleblowerTickets?: WhistleblowerTicket[] | undefined;
  recyclableDrops?: RecyclableDrop[] | undefined;
  bagHandoffs?: BagHandoff[] | undefined;
};

export const premises: Premise[] = [
  { id: "HOME-018", address: "18 Olowu Street", area: "Ikeja", detail: "Four-flat building · Ikeja GRA Statutory Franchise" },
  { id: "HOME-042", address: "4 Mainland Court", area: "Yaba", detail: "10-Room Tenement Compound · Dual-key communal drums" },
  { id: "HOME-071", address: "71 Ajah Gardens", area: "Ajah", detail: "New rollout area · Ajah Corridor Sweep" },
  { id: "SHOP-150", address: "150 Adeola Odeku Plaza", area: "Victoria Island", detail: "Commercial shopfront · Holographic Window QR Decal" },
  { id: "HOME-205", address: "205 Egbeda–Akowonjo Rd", area: "Alimosho", detail: "High-density corridor · Tue/Sat Sweep & Flood Skip zone" },
];

export const partners: Partner[] = [
  { id: "PAR-001", name: "GreenLine Collection", area: "Ikeja · Ojodu (Statutory Ward PSP)", eta: "Tue & Fri, 6–11 am", charge: 1450, capacity: "Active Ward Franchise", rating: "92% SLA compliance" },
  { id: "PAR-006", name: "Mainland Clean Services", area: "Yaba · Mainland Court Franchise", eta: "Mon & Thu, 6:30–11:30 am", charge: 1500, capacity: "Active Ward Franchise", rating: "89% SLA compliance" },
  { id: "PAR-009", name: "Neighbourhood Waste Co.", area: "Ajah Corridor Franchise", eta: "Wed & Sat, 7 am–noon", charge: 1650, capacity: "Active Ward Franchise", rating: "94% SLA compliance" },
  { id: "PAR-014", name: "ClearPath Environmental", area: "Alimosho Corridor Franchise", eta: "Tue & Sat, 6–11:30 am", charge: 1325, capacity: "Active Ward Franchise", rating: "87% SLA compliance" },
  { id: "PAR-016", name: "EkoCycle Services", area: "Victoria Island Commercial Franchise", eta: "Daily Sweep, 5:30–8:30 am", charge: 2500, capacity: "Commercial Franchise", rating: "96% SLA compliance" },
];

export const OPEN_PICKUP: PickupStatus[] = ["Requested", "Accepted", "Scheduled", "Collected"];

export const defaultCorridorSweep = (): CorridorSweep => ({
  truckId: "TRK-ALM-0042",
  plate: "LND-482-KJA",
  crewName: "Crew Alpha · Ibrahim S.",
  corridor: "Mainland – Ikeja Corridor",
  scheduleLabel: "Tue & Fri · 06:00–11:00 WAT (Corridor Sweep)",
  distanceKm: 1.3,
  etaMinutes: 9,
  stopsBeforeYou: 4,
  proximityAlertActive: true,
  lastTelemetryAgo: "18 sec ago",
});

export const defaultRemediations = (): RemediationCase[] => [
  {
    id: "CURE-CIT-901",
    ticketRef: "TKT-ALM-418",
    title: "Cleared kerbside overflow beside Gate B",
    corridor: "4 Mainland Court · Yaba",
    crewId: "TRK-ALM-0042",
    afterPhotoSummary: "PSP Crew uploaded geotagged clearance photo (6.5172° N, 3.3765° E)",
    submittedAt: "Today, 09:42 WAT",
    escrowAmountNgn: 18500,
    status: "Awaiting Citizen Key",
  },
];

export const blankModel = (customerId: string): Model => ({
  customerId, name: "", phone: "", premiseId: "", partnerId: "", pendingPartnerId: "",
  bins: [], balance: 0, reserved: 0, pickups: [], entries: [], issues: [], notices: [], cursor: "", seen: [],
  compound: createDefaultCompound(),
  corridorSweep: defaultCorridorSweep(),
  stormForecastMm: 64,
  remediations: defaultRemediations(),
  kioskVouchers: [],
  whistleblowerTickets: [],
  recyclableDrops: defaultCircularDrops(),
});

export const stamp = () => new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
export const newId = (p: string) => `${p}-${Math.floor(100000 + Math.random() * 900000)}`;
export const money = (n: number) => "₦" + n.toLocaleString("en-NG");

type Payload = { pickupId?: unknown; status?: unknown; window?: unknown; crew?: unknown; note?: unknown; binId?: unknown; issueId?: unknown; reply?: unknown; approved?: unknown; text?: unknown };
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const note = (m: Model, text: string, from: Notice["from"]): Notice[] =>
  [{ id: newId("N"), text, time: stamp(), from }, ...m.notices].slice(0, 30);

/**
 * Apply one message from the Partner Hub or LAWMA to the customer's record.
 * Money rules: the pickup charge is reserved when requested; acceptance settles
 * it once (no second debit); declining or cancelling returns it.
 */
export function applyInbound(m: Model, msg: HubMessage): Model {
  if (m.seen.includes(msg.id)) return m;
  const from = msg.from_app === "lawma" ? "lawma" : "partner";
  const p = (msg.payload ?? {}) as Payload;
  let next: Model = { ...m, seen: [msg.id, ...m.seen].slice(0, 300), cursor: msg.created_at > m.cursor ? msg.created_at : m.cursor };

  switch (msg.type) {
    case "pickup.status": {
      const pickupId = str(p.pickupId) ?? msg.ref;
      const status = str(p.status) as PickupStatus | undefined;
      const pickup = next.pickups.find((x) => x.id === pickupId);
      if (!pickup || !status || !OPEN_PICKUP.includes(pickup.status)) return next;
      const wasHeld = pickup.status === "Requested";
      next = {
        ...next,
        pickups: next.pickups.map((x) =>
          x.id !== pickupId ? x : {
            ...x, status,
            window: str(p.window) ?? x.window,
            crew: str(p.crew) ?? x.crew,
            history: [...x.history, { status, time: stamp(), note: str(p.note) }],
          }),
      };
      if (wasHeld && status !== "Requested" && status !== "Declined" && status !== "Cancelled") {
        next.reserved = Math.max(0, next.reserved - pickup.amount);
        next.entries = [{ id: newId("TX"), title: `Pickup ${pickup.id} paid`, amount: pickup.amount, time: stamp(), kind: "paid" }, ...next.entries];
      }
      if (wasHeld && (status === "Declined" || status === "Cancelled")) {
        next.reserved = Math.max(0, next.reserved - pickup.amount);
        next.balance += pickup.amount;
        next.entries = [{ id: newId("TX"), title: `Pickup ${pickup.id} returned`, amount: pickup.amount, time: stamp(), kind: "released" }, ...next.entries];
      }
      next.notices = note(next, `Pickup ${pickup.id}: ${status.toLowerCase()}${str(p.note) ? " — " + str(p.note) : ""}`, from);
      return next;
    }
    case "bin.status": {
      const binId = str(p.binId) ?? msg.ref;
      const status = str(p.status) as BinState | undefined;
      if (!status) return next;
      const target = binId ? next.bins.filter((b) => b.id === binId) : next.bins.filter((b) => b.state !== "Active");
      if (!target.length) return next;
      const ids = new Set(target.map((b) => b.id));
      next.bins = next.bins.map((b) => (ids.has(b.id) ? { ...b, state: status } : b));
      next.notices = note(next, `Bin update: ${status.toLowerCase()}.`, from);
      return next;
    }
    case "issue.update": {
      const issueId = str(p.issueId) ?? msg.ref;
      const status = str(p.status) as Issue["status"] | undefined;
      if (!next.issues.some((i) => i.id === issueId)) return next;
      next.issues = next.issues.map((i) => i.id !== issueId ? i : { ...i, status: status ?? i.status, reply: str(p.reply) ?? i.reply, from });
      next.notices = note(next, `${from === "lawma" ? "LAWMA" : "Your partner"} replied to case ${issueId}.`, from);
      return next;
    }
    case "provider_change.decision": {
      if (!next.pendingPartnerId) return next;
      const approved = p.approved === true;
      const chosen = partners.find((x) => x.id === next.pendingPartnerId);
      next = { ...next, partnerId: approved ? next.pendingPartnerId : next.partnerId, pendingPartnerId: "" };
      next.notices = note(next, approved ? `LAWMA approved your move to ${chosen?.name ?? "the new partner"}.` : `LAWMA declined the provider change${str(p.note) ? ": " + str(p.note) : "."}`, "lawma");
      return next;
    }
    case "notice.sent": {
      const text = str(p.text);
      if (!text) return next;
      next.notices = note(next, text, from);
      return next;
    }
    default:
      return next;
  }
}
