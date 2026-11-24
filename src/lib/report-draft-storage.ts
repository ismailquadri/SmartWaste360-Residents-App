import { z } from "zod";
import { reportDraft } from "@/lib/report-ai";

export const REPORT_DRAFT_KEY = "lawma-report-draft-v1";
const savedDraft = z.object({
  text: z.string(),
  location: z.string(),
  voiceTranscript: z.string(),
  draft: reportDraft.extend({ sendTo: reportDraft.shape.sendTo.min(0) }).nullable(),
});
export type SavedReportDraft = z.infer<typeof savedDraft>;

export function readReportDraft(storage: Pick<Storage, "getItem">): SavedReportDraft | null {
  try {
    const raw = storage.getItem(REPORT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = savedDraft.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function saveReportDraft(storage: Pick<Storage, "setItem">, value: SavedReportDraft): boolean {
  try {
    storage.setItem(REPORT_DRAFT_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}