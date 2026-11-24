import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import { blankModel } from "@/lib/customer-model";

beforeEach(() => localStorage.clear());

describe("Compound wallet settlement", () => {
  it("does not mark an unpaid room paid if the wallet cannot cover its share", () => {
    const insufficient = { ...blankModel("CUS-DEMO-LOCAL"), balance: 500 };
    localStorage.setItem("lawma-customer-demo-v2", JSON.stringify(insufficient));
    const { result: restored } = renderHook(() => useStore(), { wrapper: StoreProvider });
    act(() => restored.current.settleRoom("LASG-DUID-042-RM03"));
    expect(restored.current.model.balance).toBe(500);
    expect(restored.current.model.compound?.rooms.find((room) => room.duid === "LASG-DUID-042-RM03")?.paidThisMonth).toBe(false);
    expect(restored.current.model.entries).toHaveLength(0);
  });

  it("records one debit, opens all ten rooms and leaves pickup escrow untouched", () => {
    const { result } = renderHook(() => useStore(), { wrapper: StoreProvider });
    act(() => result.current.loadPresetDemo("tenement"));
    act(() => result.current.requestPickup("Tomorrow morning"));
    expect(result.current.model.reserved).toBe(1500);
    act(() => result.current.settleCompound());
    expect(result.current.model.balance).toBe(2250);
    expect(result.current.model.reserved).toBe(1500);
    expect(result.current.model.entries.filter((entry) => entry.kind === "paid")).toHaveLength(1);
    expect(result.current.model.entries.find((entry) => entry.kind === "paid")?.amount).toBe(3750);
    expect(result.current.model.compound?.rooms.filter((room) => room.paidThisMonth)).toHaveLength(10);
    act(() => result.current.settleCompound());
    expect(result.current.model.balance).toBe(2250);
    expect(result.current.model.entries.filter((entry) => entry.kind === "paid")).toHaveLength(1);
  });
});