// Pure deterministic domain helpers for Lagos Resident street-reality workflows:
// 1. Sec. 71 EMPL 2017 Statutory Ward PSP Franchise binding
// 2. Multi-room Tenement Compound DUID quorum (<60% quarantine) + Green Collection Bag QR + Tenancy Law Sec. 44
// 3. Scheduled Corridor Sweep & 1.5km PROX-PING truck telematics
// 4. Offline POS Cash Kiosk vouchers (Moniepoint/OPay/PalmPay) & *384*7006# USSD strings
// 5. Dual-Key Citizen Remediation escrow release/freeze
// 6. NiMet >=50mm/36h Pre-Storm Flood Surge & 11m³ Emergency Skip locator
// 7. Zero-Knowledge Anonymous Whistleblower Vault + Holographic Merchant Window Decal

export type RoomBillingStatus = "Paid" | "Unpaid" | "Quarantined";

export type CompoundRoom = {
  duid: string;
  roomLabel: string;
  tenantName: string;
  virtualAccount: string;
  monthlyShareNgn: number;
  arrearsDays: number;
  status: RoomBillingStatus;
  paidThisMonth: boolean;
  bagQrCode: string;
};

export type CompoundState = {
  cadastreId: string;
  compoundName: string;
  myRoomDuid: string;
  quorumThresholdPct: number;
  rooms: CompoundRoom[];
  tenancyShieldActive: boolean;
  prevTenantArrearsClearedNgn: number;
};

export type QuorumSummary = {
  paidCount: number;
  totalRooms: number;
  quorumPct: number;
  isQuarantined: boolean;
  drumStatus: "OPEN" | "QUARANTINED_LOCKED";
  mobileCourtForm1Rooms: CompoundRoom[];
};

export type CorridorSweep = {
  truckId: string;
  plate: string;
  crewName: string;
  corridor: string;
  scheduleLabel: string;
  distanceKm: number;
  etaMinutes: number;
  stopsBeforeYou: number;
  proximityAlertActive: boolean;
  lastTelemetryAgo: string;
};

export type KioskProvider = "Moniepoint" | "OPay" | "PalmPay";

export type KioskVoucher = {
  code: string;
  provider: KioskProvider;
  roomDuid: string;
  amountNgn: number;
  expiresLabel: string;
  kioskNetwork: string;
};

export type RemediationStatus =
  | "Awaiting Citizen Key"
  | "Confirmed Cleared"
  | "Disputed · Escrow Frozen";

export type RemediationCase = {
  id: string;
  ticketRef: string;
  title: string;
  corridor: string;
  crewId: string;
  afterPhotoSummary: string;
  submittedAt: string;
  escrowAmountNgn: number;
  status: RemediationStatus;
  citizenNote?: string | undefined;
  counterPhotoAttached?: boolean | undefined;
};

export type EmergencySkip = {
  id: string;
  name: string;
  corridor: string;
  distanceLabel: string;
  capacityLabel: string;
  status: "Available · Free Drop" | "75% Full" | "Dispatching Replacement";
};

export type StormSurgeState = {
  forecastMm36h: number;
  active: boolean;
  severity: "NORMAL" | "PRE_STORM_SURGE";
  headline: string;
  advisory: string;
  skips: EmergencySkip[];
};

export type WhistleblowerTicket = {
  id: string;
  category: string;
  corridor: string;
  hashedMsisdn: string;
  exifScrubbed: boolean;
  bountyNgn: number;
  bountyStatus: "Blind Escrow Locked" | "Verified · Ready for USSD Claim";
  submittedAt: string;
};

export type MerchantDecal = {
  decalCode: string;
  premiseId: string;
  businessName: string;
  statutoryLevyNgn: number;
  authorizedPartnerId: string;
  authorizedPlate: string;
  noCashExtortionRule: string;
};

export const WARD_FRANCHISE_MAP: Record<string, string> = {
  "HOME-018": "PAR-001", // Ikeja GRA -> GreenLine Collection
  "HOME-042": "PAR-006", // 4 Mainland Court Tenement Compound -> Mainland Clean Services
  "HOME-071": "PAR-009", // Ajah Gardens -> Neighbourhood Waste Co.
  "SHOP-150": "PAR-016", // Victoria Island Commercial Plaza -> EkoCycle Services
  "HOME-205": "PAR-014", // Alimosho Corridor -> ClearPath Environmental
};

export const CORRIDOR_SCHEDULE_BY_PARTNER: Record<string, string> = {
  "PAR-001": "Tue & Fri · 06:00–11:00 WAT (Corridor Sweep)",
  "PAR-006": "Mon & Thu · 06:30–11:30 WAT (Mainland Sweep)",
  "PAR-009": "Wed & Sat · 07:00–12:00 WAT (Ajah Corridor Sweep)",
  "PAR-014": "Tue & Sat · 06:00–11:30 WAT (Alimosho Corridor)",
  "PAR-016": "Daily Commercial Sweep · 05:30–08:30 WAT",
};

export const EMERGENCY_SKIPS: EmergencySkip[] = [
  {
    id: "SKP-ALM-01",
    name: "Egbeda – Akowonjo Roundabout Skip",
    corridor: "Alimosho Corridor",
    distanceLabel: "420 m away",
    capacityLabel: "11 m³ Heavy Skip · Free Drop",
    status: "Available · Free Drop",
  },
  {
    id: "SKP-IKJ-02",
    name: "Ikeja Underbridge Drainage Bay",
    corridor: "Ikeja GRA / Allen Axis",
    distanceLabel: "1.1 km away",
    capacityLabel: "11 m³ Heavy Skip · Free Drop",
    status: "Available · Free Drop",
  },
  {
    id: "SKP-SUR-03",
    name: "Bode Thomas Canal Staging Pad",
    corridor: "Surulere Canal Corridor",
    distanceLabel: "1.8 km away",
    capacityLabel: "11 m³ Heavy Skip · Free Drop",
    status: "75% Full",
  },
];

export function resolveStatutoryPartner(premiseId: string): string {
  return WARD_FRANCHISE_MAP[premiseId] ?? "PAR-001";
}

export function corridorScheduleFor(partnerId: string): string {
  return CORRIDOR_SCHEDULE_BY_PARTNER[partnerId] ?? "Tue & Fri · 06:00–11:00 WAT (Corridor Sweep)";
}

export function createDefaultCompound(): CompoundState {
  const tenants = [
    ["Rm 01", "Chinedu Okafor", true, 0],
    ["Rm 02", "Kemi Adeyemi (You)", true, 0],
    ["Rm 03", "Ibrahim Musa", false, 68],
    ["Rm 04", "Folake Balogun", true, 0],
    ["Rm 05", "Tunde Bakare", false, 34],
    ["Rm 06", "Ngozi Eze", true, 0],
    ["Rm 07", "Segun Ajayi", false, 19],
    ["Rm 08", "Bola Ogunleye", true, 0],
    ["Rm 09", "Sadiq Abubakar", false, 72],
    ["Rm 10", "Amaka Nwosu", false, 14],
  ] as const;

  return {
    cadastreId: "LASG-CAD-IKJ-042",
    compoundName: "Mainland Court · 10-Room Compound",
    myRoomDuid: "LASG-DUID-042-RM02",
    quorumThresholdPct: 60,
    tenancyShieldActive: true,
    prevTenantArrearsClearedNgn: 14500,
    rooms: tenants.map(([roomLabel, tenantName, paid, arrearsDays], idx) => {
      const num = String(idx + 1).padStart(2, "0");
      return {
        duid: `LASG-DUID-042-RM${num}`,
        roomLabel,
        tenantName,
        virtualAccount: `VACC-9042-${num}`,
        monthlyShareNgn: 750,
        arrearsDays,
        paidThisMonth: paid,
        status: paid ? "Paid" : "Unpaid",
        bagQrCode: `ROOM-QR-BAG-042-RM${num}`,
      };
    }),
  };
}

export function evaluateCompoundQuorum(
  rooms: CompoundRoom[],
  thresholdPct = 60,
): QuorumSummary {
  const totalRooms = Math.max(1, rooms.length);
  const paidCount = rooms.filter((r) => r.paidThisMonth).length;
  const quorumPct = Math.round((paidCount / totalRooms) * 100);
  const isQuarantined = quorumPct < thresholdPct;
  const mobileCourtForm1Rooms = rooms.filter((r) => !r.paidThisMonth && r.arrearsDays > 60);

  return {
    paidCount,
    totalRooms,
    quorumPct,
    isQuarantined,
    drumStatus: isQuarantined ? "QUARANTINED_LOCKED" : "OPEN",
    mobileCourtForm1Rooms,
  };
}

export function settleCompoundRoom(rooms: CompoundRoom[], duid: string): CompoundRoom[] {
  return rooms.map((r) =>
    r.duid === duid
      ? { ...r, paidThisMonth: true, arrearsDays: 0, status: "Paid" }
      : r,
  );
}

/** A batch is all-or-nothing and only charges rooms still pending. */
export function settlePendingRooms(rooms: CompoundRoom[], balance: number) {
  const pending = rooms.filter((room) => !room.paidThisMonth);
  const debit = pending.reduce((sum, room) => sum + room.monthlyShareNgn, 0);
  if (!pending.length || !Number.isFinite(balance) || balance < debit) return null;
  if (pending.some((room) => !Number.isFinite(room.monthlyShareNgn) || room.monthlyShareNgn <= 0)) return null;
  const duids = new Set(pending.map((room) => room.duid));
  return {
    balance: balance - debit,
    debit,
    settledDuids: [...duids],
    rooms: rooms.map((room) => duids.has(room.duid)
      ? { ...room, paidThisMonth: true, arrearsDays: 0, status: "Paid" as const }
      : room),
  };
}

export const LAWMA_USSD_SHORTCODE = "*384*529#";
export const LAWMA_USSD_TEL = `tel:${encodeURIComponent(LAWMA_USSD_SHORTCODE)}`;

/**
 * Lagos State Tenancy Law Sec. 44 safeguard:
 * Incoming tenant occupation resets any inherited arrears from prior occupant
 * while keeping the room DUID intact for future billing.
 */
export function applyTenancySec44Reset(
  rooms: CompoundRoom[],
  duid: string,
  incomingTenantName: string,
): CompoundRoom[] {
  const cleanName = incomingTenantName.trim() || "New Occupant (Sec. 44 Shielded)";
  return rooms.map((r) =>
    r.duid === duid
      ? {
          ...r,
          tenantName: cleanName,
          arrearsDays: 0,
          paidThisMonth: true,
          status: "Paid",
        }
      : r,
  );
}

export function generateKioskVoucher(
  provider: KioskProvider,
  roomDuid: string,
  amountNgn: number,
  seed = Date.now(),
): KioskVoucher {
  const prefix = provider === "Moniepoint" ? "MP" : provider === "OPay" ? "OP" : "PP";
  const tail = Math.abs(seed % 90000 + 10000);
  return {
    code: `POS-VOUCH-${prefix}-${tail}`,
    provider,
    roomDuid,
    amountNgn,
    expiresLabel: "Valid 24 hrs · Moniepoint / OPay / PalmPay POS Agents",
    kioskNetwork: `${provider} Kiosk Cash Agent`,
  };
}

export function buildUssdDialString(
  duid: string,
  action: "pay" | "bin" | "missed",
): string {
  const code = action === "pay" ? "1" : action === "bin" ? "2" : "3";
  const shortDuid = duid.replace(/[^A-Z0-9]/gi, "").slice(-6) || "042002";
  return `*384*7006*${code}*${shortDuid}#`;
}

export function evaluateStormSurge(
  forecastMm36h: number,
  drainBlocked = false,
): StormSurgeState {
  const active = forecastMm36h >= 50 || drainBlocked;
  if (!active) {
    return {
      forecastMm36h,
      active: false,
      severity: "NORMAL",
      headline: `NiMet Corridor Forecast: ${forecastMm36h}mm · Dry Clearance Window`,
      advisory: "Keep recyclables segregated in your compound drum until the Tue/Fri truck sweep.",
      skips: EMERGENCY_SKIPS,
    };
  }
  return {
    forecastMm36h,
    active: true,
    severity: "PRE_STORM_SURGE",
    headline: `NiMet Flood Alert (${forecastMm36h}mm / 36h) · Emergency Skips Open`,
    advisory:
      "Drainage surge expected. Drop bagged floatables for free at the nearest 11 m³ LAWMA Emergency Skip before rainfall starts.",
    skips: EMERGENCY_SKIPS,
  };
}

export function resolveCitizenRemediation(
  item: RemediationCase,
  action: "confirm" | "dispute",
  citizenNote?: string,
  counterPhotoAttached = false,
): RemediationCase {
  if (action === "confirm") {
    return {
      ...item,
      status: "Confirmed Cleared",
      citizenNote: citizenNote?.trim() || "Resident confirmed physical site evacuation.",
      counterPhotoAttached: false,
    };
  }
  if (!counterPhotoAttached && (!citizenNote || citizenNote.trim().length < 5)) {
    throw new Error("Attach a counter-photo or enter a brief note to freeze PSP escrow.");
  }
  return {
    ...item,
    status: "Disputed · Escrow Frozen",
    citizenNote: citizenNote?.trim() || "Counter-evidence uploaded: site still uncollected.",
    counterPhotoAttached,
  };
}

export function createWhistleblowerSubmission(
  category: string,
  corridor: string,
  phone: string,
  seed = Date.now(),
): WhistleblowerTicket {
  const digits = phone.replace(/\D/g, "") || "08030000000";
  let hash = 2166136261;
  for (let i = 0; i < digits.length; i++) {
    hash ^= digits.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const suffix = String(Math.abs(seed % 9000 + 1000));
  return {
    id: `WHISTLE-ANON-${suffix}`,
    category,
    corridor,
    hashedMsisdn: `zk-msisdn-${hex}`,
    exifScrubbed: true,
    bountyNgn: 10000,
    bountyStatus: "Blind Escrow Locked",
    submittedAt: "Just now",
  };
}

export function buildMerchantDecal(
  premiseId: string,
  businessName: string,
  statutoryLevyNgn: number,
  authorizedPartnerId: string,
  authorizedPlate = "LND-482-KJA",
): MerchantDecal {
  const suffix = premiseId.replace(/[^A-Z0-9]/gi, "").slice(-6) || "SHOP15";
  return {
    decalCode: `DECAL-QR-LAG-${suffix}`,
    premiseId,
    businessName,
    statutoryLevyNgn,
    authorizedPartnerId,
    authorizedPlate,
    noCashExtortionRule: "Zero Cash on Doorstep · Pay ONLY to Verified LAWMA / PSP Virtual Account",
  };
}

/* -------------------------------------------------------------------------- */
/*  Non-Linear Circular Economy: Segregation, Keke Feeders & MRF Buy-Back     */
/* -------------------------------------------------------------------------- */

export type WasteStream = "blue_recyclables" | "green_organic" | "black_residual";
export type MaterialType = "PET" | "ALUMINUM" | "HDPE" | "CARDBOARD" | "ORGANICS";

export type StreamGuide = {
  id: WasteStream;
  title: string;
  bagColor: string;
  destination: string;
  examples: string;
  incentiveNote: string;
};

export const WASTE_STREAMS: StreamGuide[] = [
  {
    id: "blue_recyclables",
    title: "Blue Bag · Dry Recyclables",
    bagColor: "Blue",
    destination: "Ward MRF / Buy-Back Kiosk & Keke Feeders",
    examples: "Clean PET water bottles, aluminum cans, HDPE jerrycans, dry cartons",
    incentiveNote: "Earns ₦120–₦650/kg Trash-to-Cash wallet credit",
  },
  {
    id: "green_organic",
    title: "Green Caddy · Organics & Food Waste",
    bagColor: "Green",
    destination: "Anaerobic Biogas / Compost Exchange Hub",
    examples: "Market vegetable peels, cold-room spoilage, food scraps (no plastic)",
    incentiveNote: "Earns ₦45/kg compost rebate & cuts canal methane",
  },
  {
    id: "black_residual",
    title: "Black Bin · Non-Recoverable Residual",
    bagColor: "Black",
    destination: "Statutory Ward PSP Compactor -> Lagos TLS",
    examples: "Soiled wrappers, sanitary waste, ash, swept street grit",
    incentiveNote: "Covered by monthly room DUID / statutory PSP levy",
  },
];

export type MaterialTariff = {
  id: MaterialType;
  label: string;
  stream: WasteStream;
  ratePerKgNgn: number;
  co2FactorKgPerKg: number;
};

export const RECYCLABLE_RATES: Record<MaterialType, MaterialTariff> = {
  PET: { id: "PET", label: "PET Bottles (Clear/Green)", stream: "blue_recyclables", ratePerKgNgn: 180, co2FactorKgPerKg: 2.1 },
  ALUMINUM: { id: "ALUMINUM", label: "Aluminum Cans", stream: "blue_recyclables", ratePerKgNgn: 650, co2FactorKgPerKg: 8.5 },
  HDPE: { id: "HDPE", label: "HDPE Plastics & Jerrycans", stream: "blue_recyclables", ratePerKgNgn: 240, co2FactorKgPerKg: 1.9 },
  CARDBOARD: { id: "CARDBOARD", label: "Clean Cardboard / Cartons", stream: "blue_recyclables", ratePerKgNgn: 120, co2FactorKgPerKg: 1.4 },
  ORGANICS: { id: "ORGANICS", label: "Sorted Market & Kitchen Organics", stream: "green_organic", ratePerKgNgn: 45, co2FactorKgPerKg: 1.2 },
};

export type CircularHub = {
  id: string;
  name: string;
  kind: "Blue-Box MRF Kiosk" | "Keke Feeder Tricycle" | "Compost & Biogas Hub";
  distanceLabel: string;
  schedule: string;
  acceptedStreams: WasteStream[];
};

export const CIRCULAR_HUBS: CircularHub[] = [
  {
    id: "HUB-IKJ-01",
    name: "Mainland Blue-Box Kiosk (Yaba Market Gate)",
    kind: "Blue-Box MRF Kiosk",
    distanceLabel: "350 m away",
    schedule: "Daily 07:00–18:00 WAT · Instant VACC credit",
    acceptedStreams: ["blue_recyclables"],
  },
  {
    id: "HUB-KEK-02",
    name: "Keke Feeder Tricycle (KEK-YAB-08)",
    kind: "Keke Feeder Tricycle",
    distanceLabel: "Inner-street loop",
    schedule: "Tue, Thu & Sat 08:00–13:00 WAT · Doorstep MRF scale",
    acceptedStreams: ["blue_recyclables", "green_organic"],
  },
  {
    id: "HUB-BIO-03",
    name: "Oyingbo Anaerobic Compost & Biogas Exchange",
    kind: "Compost & Biogas Hub",
    distanceLabel: "1.2 km away",
    schedule: "Mon–Sat 07:30–16:30 WAT · Fertilizer & fee offset",
    acceptedStreams: ["green_organic"],
  },
];

export type RecyclableDrop = {
  id: string;
  hubId: string;
  hubName: string;
  materialId: MaterialType;
  materialLabel: string;
  stream: WasteStream;
  weightKg: number;
  cleanSort: boolean;
  earnedNgn: number;
  co2SavedKg: number;
  timestamp: string;
};

export type CircularSummary = {
  totalKg: number;
  totalEarnedNgn: number;
  co2SavedKg: number;
  feeOffsetPct: number;
  eprCommercialRebateEligible: boolean;
};

export function defaultCircularDrops(): RecyclableDrop[] {
  return [
    {
      id: "MRF-DRP-801",
      hubId: "HUB-IKJ-01",
      hubName: "Mainland Blue-Box Kiosk (Yaba Market Gate)",
      materialId: "PET",
      materialLabel: "PET Bottles (Clear/Green)",
      stream: "blue_recyclables",
      weightKg: 6.5,
      cleanSort: true,
      earnedNgn: 1170,
      co2SavedKg: 13.7,
      timestamp: "2 days ago",
    },
    {
      id: "MRF-DRP-802",
      hubId: "HUB-KEK-02",
      hubName: "Keke Feeder Tricycle (KEK-YAB-08)",
      materialId: "ALUMINUM",
      materialLabel: "Aluminum Cans",
      stream: "blue_recyclables",
      weightKg: 1.8,
      cleanSort: true,
      earnedNgn: 1170,
      co2SavedKg: 15.3,
      timestamp: "5 days ago",
    },
  ];
}

export function recordCircularDrop(
  hubId: string,
  materialId: MaterialType,
  weightKg: number,
  cleanSort: boolean,
  timestamp = "Just now",
  seed = Date.now(),
): RecyclableDrop {
  if (weightKg <= 0) {
    throw new Error("Drop weight must be greater than 0 kg.");
  }
  const tariff = RECYCLABLE_RATES[materialId];
  const hub = CIRCULAR_HUBS.find((h) => h.id === hubId) ?? CIRCULAR_HUBS[0]!;
  const earnedNgn = cleanSort ? Math.round(weightKg * tariff.ratePerKgNgn) : 0;
  const co2SavedKg = cleanSort ? Number((weightKg * tariff.co2FactorKgPerKg).toFixed(1)) : 0;
  return {
    id: `MRF-DRP-${Math.abs(seed % 900 + 100)}`,
    hubId: hub.id,
    hubName: hub.name,
    materialId,
    materialLabel: tariff.label,
    stream: tariff.stream,
    weightKg: Number(weightKg.toFixed(1)),
    cleanSort,
    earnedNgn,
    co2SavedKg,
    timestamp,
  };
}

export function evaluateCircularSummary(
  drops: RecyclableDrop[],
  monthlyFeeNgn = 750,
): CircularSummary {
  const totalKg = Number(drops.reduce((s, d) => s + (d.cleanSort ? d.weightKg : 0), 0).toFixed(1));
  const totalEarnedNgn = drops.reduce((s, d) => s + d.earnedNgn, 0);
  const co2SavedKg = Number(drops.reduce((s, d) => s + d.co2SavedKg, 0).toFixed(1));
  const feeOffsetPct = Math.min(100, Math.round((totalEarnedNgn / Math.max(1, monthlyFeeNgn)) * 100));
  return {
    totalKg,
    totalEarnedNgn,
    co2SavedKg,
    feeOffsetPct,
    eprCommercialRebateEligible: totalKg >= 25,
  };
}

// ---------------- Green Bag QR handoff verification ----------------

export type BagHandoffStatus = "Verified" | "Rejected";
export type BagHandoff = {
  id: string;
  scannedCode: string;
  roomDuid: string;
  roomLabel: string;
  bags: number;
  crew: string;
  truckId: string;
  status: BagHandoffStatus;
  reason: string;
  at: string;
};

/**
 * Checks a crew scan of a Green Bag pass. Verified only when the scanned code is this room's
 * pass and the room has paid this month; otherwise rejected with a plain-language reason.
 */
export function verifyBagHandoff(
  scannedCode: string,
  room: Pick<CompoundRoom, "duid" | "roomLabel" | "bagQrCode" | "paidThisMonth">,
  bags: number,
): { status: BagHandoffStatus; reason: string } {
  const code = scannedCode.trim().toUpperCase();
  if (!code) return { status: "Rejected", reason: "No code was scanned." };
  if (code !== room.bagQrCode.toUpperCase())
    return { status: "Rejected", reason: `The scanned code doesn't match ${room.roomLabel}'s pass.` };
  if (!room.paidThisMonth)
    return { status: "Rejected", reason: `${room.roomLabel} hasn't paid this month, so the crew can't take the bags yet.` };
  if (!Number.isInteger(bags) || bags < 1 || bags > 10)
    return { status: "Rejected", reason: "Bag count must be between 1 and 10." };
  return { status: "Verified", reason: `${bags} bag${bags === 1 ? "" : "s"} collected from ${room.roomLabel}.` };
}
