import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";
import { Route } from "@/routes/you";

vi.mock("@/components/app", () => ({
  Phone: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  PageTitle: () => null,
  LinkStatus: () => null,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("lawma-customer-demo-v2", JSON.stringify({ name: "Kemi", phone: "08034518820", premiseId: "HOME-042", partnerId: "PAR-006" }));
  localStorage.setItem("lawma-report-draft-v1", "saved draft");
});

function ResidentState() {
  const { model } = useStore();
  return <output aria-label="Resident name">{model.name || "No resident"}</output>;
}

describe("Profile demo reset", () => {
  it("preserves data on cancel and clears it only after explicit deletion confirmation", () => {
    const Page = Route.options.component;
    if (!Page) throw new Error("Profile page missing");
    render(<StoreProvider><Page /><ResidentState /></StoreProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    expect(screen.getByLabelText("Resident name").textContent).toBe("Kemi");
    fireEvent.click(screen.getByRole("button", { name: "Keep my data" }));
    expect(screen.getByLabelText("Resident name").textContent).toBe("Kemi");
    expect(localStorage.getItem("lawma-report-draft-v1")).toBe("saved draft");
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete demo data" }));
    expect(screen.getByLabelText("Resident name").textContent).toBe("No resident");
    expect(localStorage.getItem("lawma-report-draft-v1")).toBeNull();
  });
});