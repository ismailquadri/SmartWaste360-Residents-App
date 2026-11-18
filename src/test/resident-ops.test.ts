import { describe, expect, it } from "vitest";
import {
  applyTenancySec44Reset,
  buildMerchantDecal,
  buildUssdDialString,
  createDefaultCompound,
  createWhistleblowerSubmission,
  defaultCircularDrops,
  evaluateCircularSummary,
  evaluateCompoundQuorum,
  evaluateStormSurge,
  generateKioskVoucher,
  recordCircularDrop,
  resolveCitizenRemediation,
  resolveStatutoryPartner,
  settleCompoundRoom,
  type RemediationCase,
} from "@/lib/resident-ops";

describe("resident-ops Lagos street workflows", () => {
  it("binds each premise to its statutory Sec. 71 Ward PSP franchise", () => {
    expect(resolveStatutoryPartner("HOME-018")).toBe("PAR-001");
    expect(resolveStatutoryPartner("HOME-042")).toBe("PAR-006");
    expect(resolveStatutoryPartner("SHOP-150")).toBe("PAR-016");
    expect(resolveStatutoryPartner("HOME-205")).toBe("PAR-014");
  });

  it("quarantines communal compound drum below 60% room quorum and unlocks at >=60%", () => {
    const compound = createDefaultCompound();
    const initial = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
    expect(initial.paidCount).toBe(5);
    expect(initial.totalRooms).toBe(10);
    expect(initial.quorumPct).toBe(50);
    expect(initial.isQuarantined).toBe(true);
    expect(initial.drumStatus).toBe("QUARANTINED_LOCKED");
    expect(initial.mobileCourtForm1Rooms.map((r) => r.duid)).toContain("LASG-DUID-042-RM03");

    const updated = settleCompoundRoom(compound.rooms, "LASG-DUID-042-RM05");
    const afterPay = evaluateCompoundQuorum(updated, compound.quorumThresholdPct);
    expect(afterPay.paidCount).toBe(6);
    expect(afterPay.quorumPct).toBe(60);
    expect(afterPay.isQuarantined).toBe(false);
    expect(afterPay.drumStatus).toBe("OPEN");
  });

  it("clears previous occupant arrears under Lagos Tenancy Law Sec. 44", () => {
    const compound = createDefaultCompound();
    const reset = applyTenancySec44Reset(compound.rooms, "LASG-DUID-042-RM03", "Amina Yusuf");
    const rm03 = reset.find((r) => r.duid === "LASG-DUID-042-RM03");
    expect(rm03?.tenantName).toBe("Amina Yusuf");
    expect(rm03?.arrearsDays).toBe(0);
    expect(rm03?.status).toBe("Paid");
  });

  it("generates kiosk POS cash vouchers and offline *384*7006# USSD codes", () => {
    const voucher = generateKioskVoucher("Moniepoint", "LASG-DUID-042-RM02", 750, 123456);
    expect(voucher.code).toMatch(/^POS-VOUCH-MP-/);
    expect(voucher.amountNgn).toBe(750);
    expect(buildUssdDialString("LASG-DUID-042-RM02", "pay")).toBe("*384*7006*1*42RM02#");
  });

  it("enforces Dual-Key citizen remediation confirm vs escrow-freeze dispute", () => {
    const sample: RemediationCase = {
      id: "CURE-CIT-901",
      ticketRef: "TKT-ALM-418",
      title: "Cleared overflow beside Gate B",
      corridor: "Mainland Court · Ikeja",
      crewId: "TRK-ALM-0042",
      afterPhotoSummary: "PSP Crew uploaded geotagged clearance photo (6.5831° N)",
      submittedAt: "Today, 09:42 WAT",
      escrowAmountNgn: 18500,
      status: "Awaiting Citizen Key",
    };

    expect(() => resolveCitizenRemediation(sample, "dispute", "", false)).toThrow();

    const disputed = resolveCitizenRemediation(
      sample,
      "dispute",
      "Waste still stacked along drainage culvert.",
      true,
    );
    expect(disputed.status).toBe("Disputed · Escrow Frozen");
    expect(disputed.counterPhotoAttached).toBe(true);

    const confirmed = resolveCitizenRemediation(sample, "confirm");
    expect(confirmed.status).toBe("Confirmed Cleared");
  });

  it("activates Pre-Storm Flood Surge & Emergency Skips at >= 50mm / 36h", () => {
    expect(evaluateStormSurge(18).active).toBe(false);
    const storm = evaluateStormSurge(64);
    expect(storm.active).toBe(true);
    expect(storm.severity).toBe("PRE_STORM_SURGE");
    expect(storm.skips.length).toBeGreaterThanOrEqual(3);
  });

  it("hashes whistleblower MSISDN, scrubs EXIF, and formats merchant holographic decals", () => {
    const wb = createWhistleblowerSubmission("Night-Time Illegal Dump", "Alimosho Canal", "0803 111 2233", 4421);
    expect(wb.id).toBe("WHISTLE-ANON-5421");
    expect(wb.hashedMsisdn).toMatch(/^zk-msisdn-[0-9A-F]{8}$/);
    expect(wb.hashedMsisdn).not.toContain("0803");
    expect(wb.exifScrubbed).toBe(true);

    const decal = buildMerchantDecal("SHOP-150", "Balogun Cold-Room Plaza", 12500, "PAR-004");
    expect(decal.decalCode).toBe("DECAL-QR-LAG-HOP150");
    expect(decal.statutoryLevyNgn).toBe(12500);
  });

  it("credits clean MRF recyclable drops, blocks contaminated drops, and computes fee offset + EPR rebate", () => {
    const cleanPet = recordCircularDrop("HUB-IKJ-01", "PET", 5, true, "Today", 123);
    expect(cleanPet.earnedNgn).toBe(900);
    expect(cleanPet.co2SavedKg).toBe(10.5);

    const dirtyDrop = recordCircularDrop("HUB-IKJ-01", "PET", 4, false, "Today", 124);
    expect(dirtyDrop.earnedNgn).toBe(0);
    expect(dirtyDrop.co2SavedKg).toBe(0);

    const starter = defaultCircularDrops();
    const summary = evaluateCircularSummary([...starter, cleanPet], 750);
    expect(summary.totalKg).toBe(13.3);
    expect(summary.feeOffsetPct).toBe(100);
    expect(summary.eprCommercialRebateEligible).toBe(false);

    const heavyCardboard = recordCircularDrop("HUB-KEK-02", "CARDBOARD", 15, true, "Today", 125);
    const eprSummary = evaluateCircularSummary([...starter, cleanPet, heavyCardboard], 12500);
    expect(eprSummary.totalKg).toBe(28.3);
    expect(eprSummary.eprCommercialRebateEligible).toBe(true);
  });
});
