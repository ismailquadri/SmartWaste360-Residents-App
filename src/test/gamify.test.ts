import { describe, expect, it } from "vitest";
import { milestonesFor } from "@/lib/gamify";
import { createDefaultCompound } from "@/lib/resident-ops";
import type { Model } from "@/lib/customer-model";

const base = { premiseId: "HOME-042", bagHandoffs: [] } as unknown as Model;

describe("waste milestones", () => {
  it("no milestone while some rooms are unpaid", () => {
    const c = createDefaultCompound();
    c.rooms[0]!.paidThisMonth = false;
    expect(milestonesFor({ ...base, compound: c })).toHaveLength(0);
  });
  it("celebrates when every room has paid", () => {
    const c = createDefaultCompound();
    c.rooms.forEach((r) => (r.paidThisMonth = true));
    expect(milestonesFor({ ...base, compound: c })[0]?.title).toContain("100%");
  });
  it("celebrates only verified bag handoffs", () => {
    const c = createDefaultCompound();
    c.rooms[0]!.paidThisMonth = false;
    const h = { id: "h1", bags: 2, roomLabel: "Rm 02", truckId: "TRK-ALM-0042", crew: "Crew Alpha" };
    const ms = milestonesFor({ ...base, compound: c, bagHandoffs: [{ ...h, status: "Verified" }, { ...h, id: "h2", status: "Rejected" }] } as unknown as Model);
    expect(ms.map((x) => x.id)).toEqual(["bag-h1"]);
    expect(ms[0]?.body).toContain("TRK-ALM-0042");
  });
});
