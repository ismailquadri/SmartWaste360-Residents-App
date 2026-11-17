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
