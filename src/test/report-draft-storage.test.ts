import { beforeEach, describe, expect, it } from "vitest";
import { readReportDraft, REPORT_DRAFT_KEY, saveReportDraft, type SavedReportDraft } from "@/lib/report-draft-storage";

beforeEach(() => localStorage.clear());

describe("Offline report drafts", () => {
  it("reads back the resident's text, voice transcript, location and edited review without network access", () => {
    const draft: SavedReportDraft = {
      text: "Waste beside Gate B", voiceTranscript: "Truck no come", location: "4 Mainland Court, Yaba",
      draft: { title: "Missed pickup", report: "Truck did not collect our waste", category: "Missed pickup", urgency: "medium", sendTo: ["partner", "lawma"] },
    };
    expect(saveReportDraft(localStorage, draft)).toBe(true);
    expect(readReportDraft(localStorage)).toEqual(draft);
  });

  it("does not call a draft saved if device storage rejects it", () => {
    expect(saveReportDraft({ setItem: () => { throw new Error("Storage unavailable"); } }, { text: "Waste", location: "Yaba", voiceTranscript: "", draft: null })).toBe(false);
  });

  it("ignores corrupted saved data", () => {
    localStorage.setItem(REPORT_DRAFT_KEY, "invalid JSON");
    expect(readReportDraft(localStorage)).toBeNull();
  });
});