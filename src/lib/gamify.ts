import type { Model } from "./customer-model";
import { createDefaultCompound, evaluateCompoundQuorum } from "./resident-ops";

export type Milestone = { id: string; icon: string; title: string; body: string };

/**
 * Genuine waste milestones only — no streaks, XP or habit tasks.
 * - Compound reaches 100% room quorum → communal drum released.
 * - A Green Bag handoff is verified by the truck crew.
 */
export function milestonesFor(m: Model): Milestone[] {
  const out: Milestone[] = [];
  if (m.premiseId === "HOME-042") {
    const c = m.compound ?? createDefaultCompound();
    const q = evaluateCompoundQuorum(c.rooms, c.quorumThresholdPct);
    if (q.paidCount === q.totalRooms) {
      out.push({
        id: `quorum-100-${c.cadastreId}`,
        icon: "🛢️",
        title: "Your compound is 100% paid!",
        body: `All ${q.totalRooms} rooms have settled. The communal drum is released and the next corridor sweep will empty it.`,
      });
    }
  }
  for (const h of m.bagHandoffs ?? []) {
    if (h.status !== "Verified") continue;
    out.push({
      id: `bag-${h.id}`,
      icon: "🛍️",
      title: "Bag collection verified!",
      body: `${h.bags} Green Bag${h.bags === 1 ? "" : "s"} from ${h.roomLabel} confirmed by ${h.truckId} (${h.crew}).`,
    });
  }
  return out;
}
