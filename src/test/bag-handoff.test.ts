import { describe, expect, it } from "vitest";
import { verifyBagHandoff } from "@/lib/resident-ops";

const room = { duid: "VACC-9042-02", roomLabel: "Rm 02", bagQrCode: "ROOM-QR-BAG-042-RM02", paidThisMonth: true };

describe("Green Bag handoff verification", () => {
  it("verifies a scan of the room's own pass when the room has paid", () => {
    expect(verifyBagHandoff("ROOM-QR-BAG-042-RM02", room, 2).status).toBe("Verified");
  });
  it("rejects a scan of another room's pass", () => {
    expect(verifyBagHandoff("ROOM-QR-BAG-042-RM05", room, 2).status).toBe("Rejected");
  });
  it("rejects when the room hasn't paid this month", () => {
    expect(verifyBagHandoff("ROOM-QR-BAG-042-RM02", { ...room, paidThisMonth: false }, 2).status).toBe("Rejected");
  });
});
