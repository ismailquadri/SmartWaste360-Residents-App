import { useLanguage } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Gavel, Landmark, Recycle, Smartphone } from "lucide-react";
import { FluxioArrowDown as ArrowDownLeft, FluxioArrowUp as ArrowUpRight, FluxioCheck as Check, FluxioClock as Clock, FluxioCreditCard as CreditCard, FluxioWalletAdd as Plus, FluxioQrCode as QrCode, FluxioShieldCheck as ShieldCheck, FluxioStore as Store, FluxioWallet as WalletIcon } from "@/components/icons/FluxioIcons";
import { useRef, useState } from "react";
import { PageTitle, Phone } from "@/components/app";
import { PaymentDemoBadge } from "@/components/PaymentDemoBadge";
import { Button } from "@/components/ui/button";
import {
  IosBadge,
  IosButton,
  IosEmpty,
  IosRow,
  IosSection,
  IosSegmentedControl,
  IosSheet,
} from "@/components/ios";
import { money } from "@/lib/customer-model";
import { meta } from "@/lib/meta";
import {
  buildUssdDialString,
  CIRCULAR_HUBS,
  createDefaultCompound,
  defaultCircularDrops,
  evaluateCircularSummary,
  evaluateCompoundQuorum,
  RECYCLABLE_RATES,
  LAWMA_USSD_SHORTCODE,
  LAWMA_USSD_TEL,
  type KioskProvider,
  type KioskVoucher,
  type MaterialType,
} from "@/lib/resident-ops";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => meta("Wallet", "Top up your LAWMA 360 wallet and see every pickup payment."),
  component: WalletPage,
});

const amounts = [2000, 5000, 10000, 20000] as const;

const methods = [
  { id: "Card", icon: CreditCard, tone: "blue" as const, sub: "Visa, Mastercard, Verve" },
  { id: "Bank transfer", icon: Landmark, tone: "forest" as const, sub: "Instant from any Nigerian bank" },
  { id: "USSD", icon: Smartphone, tone: "ember" as const, sub: "Dial a code, no internet needed" },
] as const;

type Filter = "all" | "in" | "out";
type Review = { kind: "topup"; method: string } | { kind: "room"; duid: string } | { kind: "kiosk" };

const filterOptions = [
  { value: "all" as const, label: "All" },
  { value: "in" as const, label: "Money in" },
  { value: "out" as const, label: "Money out" },
] as const;

function WalletPage() {
  const { t: tr, localize } = useLanguage();
  const { model, topUp, settleRoom, settleCompound, applySec44Shield, createPosVoucher, logCircularDrop } = useStore();
  const [walletView, setWalletView] = useState<"resident" | "caretaker">("resident");
  const [settlementDone, setSettlementDone] = useState(false);
  const [sheet, setSheet] = useState<null | "amount" | "method" | "done" | "kiosk" | "ussd" | "recycle" | "review">(null);
  const [review, setReview] = useState<Review | null>(null);
  const [amount, setAmount] = useState<number>(5000);
  const [amountText, setAmountText] = useState("5000");
  const amountInputRef = useRef<HTMLInputElement>(null);

  const applyAmount = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 7);
    setAmountText(digits);
    setAmount(digits ? Number(digits) : 0);
  };
  const [filter, setFilter] = useState<Filter>("all");
  const [kioskProvider, setKioskProvider] = useState<KioskProvider>("Moniepoint");
  const [latestVoucher, setLatestVoucher] = useState<KioskVoucher | null>(
    () => model.kioskVouchers?.[0] ?? null,
  );
  const [sec44AppliedMsg, setSec44AppliedMsg] = useState<string | null>(null);
  const [dropHub, setDropHub] = useState<string>(CIRCULAR_HUBS[0]!.id);
  const [dropMat, setDropMat] = useState<MaterialType>("PET");
  const [dropKg, setDropKg] = useState<number>(4);
  const [dropClean, setDropClean] = useState<boolean>(true);
  const [dropStatusMsg, setDropStatusMsg] = useState<string | null>(null);

  const isIn = (k: string) => k === "credit" || k === "released";
  const entries = model.entries.filter((e) => filter === "all" || (filter === "in") === isIn(e.kind));
  const [whole, kobo] = money(model.balance).split(".");
  const addedThisMonth = model.entries
    .filter((e) => e.kind === "credit")
    .reduce((s, e) => s + e.amount, 0);

  const compound = model.compound ?? createDefaultCompound();
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const pendingRooms = compound.rooms.filter((room) => !room.paidThisMonth);
  const compoundBalance = pendingRooms.reduce((sum, room) => sum + room.monthlyShareNgn, 0);
  const activeVouchers = model.kioskVouchers ?? [];
  const circularDrops = model.recyclableDrops ?? defaultCircularDrops();
  const circular = evaluateCircularSummary(circularDrops, 750);
  const myRoom = compound.rooms.find((x) => x.duid === compound.myRoomDuid);
  const roomsNeeded = Math.max(0, Math.ceil((quorum.totalRooms * compound.quorumThresholdPct) / 100) - quorum.paidCount);
  const reviewRoom = review?.kind === "room" ? compound.rooms.find((x) => x.duid === review.duid) : undefined;
  const reviewAmount = review?.kind === "room" ? (reviewRoom?.monthlyShareNgn ?? 0) : review?.kind === "kiosk" ? 750 : amount;
  const balanceAfter = review?.kind === "room" ? model.balance - reviewAmount : review?.kind === "kiosk" ? model.balance : model.balance + reviewAmount;
  const destination =
    review?.kind === "room"
      ? `${reviewRoom?.roomLabel ?? "Room"} share of the compound bill, paid from your wallet to your collection partner (PSP)`
      : review?.kind === "kiosk"
        ? `A cash voucher for ${myRoom?.roomLabel ?? compound.myRoomDuid}. You pay the ${kioskProvider} agent in cash; nothing leaves your wallet now`
        : `Your room wallet ${compound.myRoomDuid}, via ${review?.kind === "topup" ? review.method : "your chosen method"}`;
  const blocked =
    review?.kind === "room" && (!reviewRoom || reviewRoom.paidThisMonth || model.balance < reviewRoom.monthlyShareNgn);
  const confirmPay = () => {
    if (!review || blocked) return;
    if (review.kind === "topup") { topUp(amount, review.method); setSheet("done"); return; }
    if (review.kind === "room" && reviewRoom) { settleRoom(reviewRoom.duid); setSheet(null); return; }
    if (review.kind === "kiosk") { setLatestVoucher(createPosVoucher(kioskProvider, compound.myRoomDuid, 750)); setSheet("kiosk"); }
  };

  return (
    <Phone>
      <PageTitle title={tr("Wallet")} sub={tr("Pay your room share. Top up at any kiosk.")} />

      <section className="wallet-balance" aria-label={tr("Wallet balance")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75">{tr("Room Virtual Account ·")}{" "}{localize(compound.myRoomDuid.slice(-4))}
            </p>
            <p className="mt-1.5 text-[40px] font-bold leading-none tracking-tight tabular-nums">
              {localize(whole)}
              {kobo !== undefined && <span className="text-2xl text-white/60">.{localize(kobo)}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheet("amount")}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-primary shadow-sm hover:bg-white/95"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />{tr("Add")}{" "}</button>
        </div>

        <div className="wallet-summary">
          <div>
            <span className="text-[12px] text-white/75">{tr("Money added")}</span>
            <p className="tabular-nums">{localize(money(addedThisMonth))}</p>
          </div>
          <div className="text-right">
            <span className="text-[12px] text-white/75">{tr("Held in PSP escrow")}</span>
            <p className="tabular-nums">{localize(money(model.reserved))}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-6">
        <IosSection header={tr("Next action")}>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-foreground">{localize(compound.compoundName)}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {localize(myRoom
                    ? `${myRoom.roomLabel}: ${myRoom.paidThisMonth ? "your room is paid for this month" : `${money(myRoom.monthlyShareNgn)} still to pay`}.`
                    : "Your room isn't linked yet. Ask your caretaker or landlord.")}
                </p>
              </div>
              <IosBadge>{myRoom?.paidThisMonth ? "Room paid" : "Action needed"}</IosBadge>
            </div>
            <p className="rounded-xl bg-muted p-3 text-[14px] font-semibold text-foreground">
              {localize(quorum.paidCount)}{" "}{tr("of")}{" "}{localize(quorum.totalRooms)}{" "}{tr("rooms paid —")}{localize(" ")}
              {localize(quorum.isQuarantined
                ? `shared drum locked until ${roomsNeeded} more room${roomsNeeded === 1 ? " pays" : "s pay"}.`
                : "shared drum open for normal collection.")}
            </p>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className={cn("h-full rounded-full", quorum.isQuarantined ? "bg-destructive" : "bg-primary")} style={{ width: `${quorum.quorumPct}%` }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">{tr("Before collection day")}</p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[13px] text-muted-foreground">
                <li>{localize(myRoom?.paidThisMonth ? "You're paid. Keep your receipt below." : "Pay your room share in the list below (add money first if needed).")}</li>
                <li>{localize(quorum.isQuarantined ? "Don't use the shared drum. Tie your waste in your Green Bags." : "Bag your waste and use the shared drum.")}</li>
                <li>{localize(quorum.isQuarantined ? "Show your Green Bag pass to the crew when they arrive." : "Have it out before the truck comes.")}</li>
              </ol>
              {quorum.isQuarantined && (
                <Link to="/bins" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground">
                  <QrCode className="size-4" aria-hidden="true" />{tr("My Green Bag pass")}</Link>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">
              <strong className="text-foreground">{tr("Unlock the shared drum:")}</strong> {localize(quorum.isQuarantined ? `Pay ${roomsNeeded} more room share${roomsNeeded === 1 ? "" : "s"} to reach ${compound.quorumThresholdPct}% paid. Each pending share is listed below; a caretaker can settle them together.` : "Enough rooms are paid for shared collection.")}{" "}{tr("Keep using your Green Bag pass while it is locked. Only LAWMA can lift a separate official restriction.")}</p>
            <div className="border-t border-border pt-3 text-[13px]">
              <p className="flex items-start gap-2 text-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{tr("Old debts from the person who lived in your room before you are not yours to pay.")}{" "}{localize(money(compound.prevTenantArrearsClearedNgn))}{" "}{tr("was cleared when you moved in.")}</p>
              {quorum.mobileCourtForm1Rooms.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-foreground">
                  <Gavel className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                  {localize(quorum.mobileCourtForm1Rooms.length)}{" "}{tr("room")}{localize(quorum.mobileCourtForm1Rooms.length === 1 ? " has" : "s have")}{" "}{tr("not paid for over 60 days and may get a court warning letter. This does not affect rooms that have paid.")}</p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold text-primary">{tr("Read full notice")}</summary>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">{tr("In short: pay the pending room shares to reach")}{" "}{localize(compound.quorumThresholdPct)}{tr("% and reopen the drum. New tenants do not inherit the last tenant’s debt. If a court letter names your room, ask your caretaker or LAWMA to check the record; paying does not cancel an official court notice.")}</p>
                  <p>{tr("Compound Quorum & Drum Access. Required payment quorum:")}{" "}{localize(compound.quorumThresholdPct)}{tr("% (currently")}{" "}{localize(quorum.quorumPct)}{tr("%). Below this threshold the communal drum is quarantined; paying residents retain disposal via My Green Collection Bags QR. Cadastre")}{" "}{localize(compound.cadastreId)}.</p>
                  <p>{tr("Tenancy Law Sec. 44 Shield:")}{" "}{localize(money(compound.prevTenantArrearsClearedNgn))}{" "}{tr("outgoing tenant debt wiped on move-in.")}</p>
                  {quorum.mobileCourtForm1Rooms.length > 0 && (
                    <p>{tr("Mobile Court Form 1 Notice (rooms over 60 days):")}{" "}{localize(quorum.mobileCourtForm1Rooms.map((x) => `${x.roomLabel} (${x.arrearsDays}d)`).join(" · "))}.</p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </IosSection>

        <section aria-label={tr("Compound quorum")} className="ios-card mb-4 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[15px] font-extrabold">{localize(quorum.paidCount)}/{localize(quorum.totalRooms)}{" "}{tr("rooms paid")}</p>
            <p className={cn("text-[13px] font-extrabold", quorum.isQuarantined ? "text-ember" : "text-success")}>
              {localize(Math.round((quorum.paidCount / Math.max(1, quorum.totalRooms)) * 100))}{tr("% of")}{" "}{localize(compound.quorumThresholdPct)}{tr("% needed")}</p>
          </div>
          <div className="relative mt-2 h-2.5 rounded-full bg-muted">
            <div className={cn("h-full rounded-full", quorum.isQuarantined ? "bg-ember" : "bg-success")} style={{ width: `${Math.min(100, (quorum.paidCount / Math.max(1, quorum.totalRooms)) * 100)}%` }} />
            <span aria-hidden="true" className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground" style={{ left: `${compound.quorumThresholdPct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5" role="list" aria-label={tr("Rooms by payment status")}>
            {compound.rooms.map((r) => {
              const mine = r.duid === compound.myRoomDuid;
              return (
                <div
                  key={r.duid}
                  role="listitem"
                  aria-label={tr("{0}: {1}{2}", r.roomLabel, tr(r.paidThisMonth ? "Paid" : "Due").toLocaleLowerCase(), mine ? tr(", your room") : "")}
                  className={cn(
                    "grid h-9 place-items-center rounded-lg text-[13px] font-extrabold tabular-nums",
                    r.paidThisMonth ? "bg-success text-white" : "bg-muted text-muted-foreground",
                    mine && "outline-2 outline-offset-2 outline-ember",
                  )}
                >
                  {localize(r.roomLabel.replace(/^Room\s*/i, ""))}
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" aria-hidden="true" />{tr("Paid")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted" aria-hidden="true" />{tr("Due")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-card outline-[1.5px] outline-ember" aria-hidden="true" />{tr("You")}</span>
          </div>
          <p className="mt-3 text-[13px] font-semibold">
            {localize(quorum.isQuarantined ? "Pay your share to help unlock the drum." : "Enough rooms paid. Drum open.")}
          </p>
        </section>

        {model.premiseId === "HOME-042" && (
          <section aria-label={tr("Compound settlement")} className="space-y-3">
            <IosSegmentedControl label={tr("Demo wallet view")} value={walletView} onChange={setWalletView} options={[
              { value: "resident", label: "Resident" }, { value: "caretaker", label: "Caretaker · Demo" },
            ]} />
            {walletView === "caretaker" && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">{tr("Compound balance")}</h2>
                  <p className="text-[20px] font-bold tabular-nums">{localize(money(compoundBalance))}</p>
                </div>
                <p className="text-[13px] text-muted-foreground">{localize(pendingRooms.length)}{" "}{tr("pending rooms · from this demo wallet. Paid rooms are not charged again.")}</p>
                <PaymentDemoBadge />
                <IosButton tone="primary" disabled={!pendingRooms.length || model.balance < compoundBalance} onClick={() => { settleCompound(); setSettlementDone(true); }}>
                  {localize(pendingRooms.length ? "Settle all pending rooms" : "All rooms settled")}
                </IosButton>
                {model.balance < compoundBalance && <p role="status" className="text-[13px] text-destructive">{tr("Add")}{" "}{localize(money(compoundBalance - model.balance))}{" "}{tr("first. No rooms have been charged.")}</p>}
                {settlementDone && !pendingRooms.length && <p role="status" className="text-[13px] font-medium text-success">{tr("Compound settled. Shared drum open.")}</p>}
              </div>
            )}
          </section>
        )}

        <IosSection header={tr("Room-by-Room Virtual Ledger")} footer={tr("Tap Review on an unpaid room to see the details before paying.")}>
          {compound.rooms.map((r) => (
            <IosRow
              key={r.duid}
              icon={<Building2 className="size-4" />}
              iconTone={r.paidThisMonth ? "green" : r.arrearsDays > 60 ? "red" : "ember"}
              title={tr("{0} · {1}", r.roomLabel, r.tenantName)}
              subtitle={
                localize(r.paidThisMonth
                  ? `${r.virtualAccount} · Bag QR ${r.bagQrCode.slice(-6)}`
                  : `${r.virtualAccount} · ${r.arrearsDays}d arrears`)
              }
              trailing={
                r.paidThisMonth ? (
                  <IosBadge>Paid</IosBadge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {r.arrearsDays > 60 && (
                      <button
                        type="button"
                        onClick={() => {
                          applySec44Shield(r.duid, `New Tenant (${r.roomLabel})`);
                          setSec44AppliedMsg(`Sec. 44 Shield cleared prior tenant debt on ${r.roomLabel}.`);
                        }}
                        className="rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-[#d6ebdf]"
                      >{tr("Sec. 44")}</button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setReview({ kind: "room", duid: r.duid }); setSheet("review"); }}
                      className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#12472e]"
                    >{tr("Review")}{" "}{localize(money(r.monthlyShareNgn))}
                    </button>
                  </div>
                )
              }
            />
          ))}
        </IosSection>

        {sec44AppliedMsg && (
          <div role="status" className="rounded-[14px] bg-[#e8f3ec] p-3 text-[13px] font-medium text-[#12472e]">
            {localize(sec44AppliedMsg)}
          </div>
        )}

        <IosSection
          header={tr("Trash-to-Cash & MRF Buy-Back")}
          footer={tr("Drop clean sorted PET, Aluminum, HDPE, Cardboard, or Organics at any hub or Keke feeder to credit VACC and offset PSP bills.")}
        >
          <IosRow
            onClick={() => {
              setDropStatusMsg(null);
              setSheet("recycle");
            }}
            icon={<Recycle className="size-4" />}
            iconTone="green"
            title={tr("Log Recyclables / Keke Drop")}
            subtitle={tr("{0}kg diverted ({1}kg CO₂) · Offsets {2}% of room fee", circular.totalKg, circular.co2SavedKg, circular.feeOffsetPct)}
            detail={tr("+{0}", money(circular.totalEarnedNgn))}
            disclosure
          />
        </IosSection>

        <IosSection header={tr("Cash & USSD")} footer={tr("Use a POS voucher or dial *384*529#.")}>
          <IosRow
            onClick={() => setSheet("kiosk")}
            icon={<Store className="size-4" />}
            iconTone="ember"
            title={tr("Pay Cash at POS Kiosk Agent")}
            subtitle={tr("Generate POS-VOUCH code for Moniepoint, OPay, or PalmPay")}
            detail={localize(activeVouchers[0]?.code)}
            disclosure
          />
          <IosRow
            onClick={() => setSheet("ussd")}
            icon={<Smartphone className="size-4" />}
            iconTone="blue"
            title={tr("Dial *384*529#")}
            subtitle={tr("Works with 0MB mobile data on MTN, Airtel, Glo & 9mobile")}
            disclosure
          />
        </IosSection>
      </div>

      <div className="mt-6">
        <IosSegmentedControl
          label={tr("Filter transactions")}
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <div className="mt-4">
        {entries.length === 0 ? (
          <IosEmpty icon={<WalletIcon className="size-5" />} title={tr("No transactions yet")}>{tr("Top up your wallet or settle a room share above.")}</IosEmpty>
        ) : (
          <IosSection header={tr("Transactions")} footer={tr("Demo ledger — room settlements update compound quorum immediately.")}>
            {entries.map((e) => {
              const credit = isIn(e.kind);
              const reserved = e.kind === "reserved";
              return (
                <IosRow
                  key={e.id}
                  icon={
                    credit ? (
                      <ArrowDownLeft className="size-4" />
                    ) : reserved ? (
                      <Clock className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )
                  }
                  iconTone={credit ? "green" : reserved ? "ember" : "slate"}
                  title={localize(e.title)}
                  subtitle={localize(e.time)}
                  trailing={
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums",
                        credit ? "text-[#17682c]" : "text-foreground",
                      )}
                    >
                      {localize(credit ? "+" : "−")}
                      {localize(money(e.amount))}
                    </span>
                  }
                />
              );
            })}
          </IosSection>
        )}
      </div>

      <IosSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        notice={sheet !== "recycle" ? <PaymentDemoBadge /> : undefined}
        title={
          localize(sheet === "review"
            ? "Review payment"
            : sheet === "amount"
            ? "Add money"
            : sheet === "method"
              ? `Pay ${money(amount)}`
              : sheet === "kiosk"
                ? "POS Kiosk Cash Voucher"
                : sheet === "ussd"
                  ? "Call LAWMA USSD"
                  : sheet === "recycle"
                    ? "Trash-to-Cash Buy-Back"
                    : "Top-up complete")
        }
      >
        {sheet === "review" && review && (
          <div className="space-y-4 pt-1">
            <dl className="divide-y divide-border rounded-xl border border-border bg-card text-[14px]">
              {[
                ["Amount", money(reviewAmount)],
                ["Fee", `${money(0)} (no fee)`],
                ["You pay in total", money(reviewAmount)],
                ["Goes to", destination],
                ["Wallet balance now", money(model.balance)],
                ["Wallet balance after", balanceAfter < 0 ? "Not enough money — add money first" : money(balanceAfter)],
                ["Held for pickups (escrow)", `${money(model.reserved)} — not touched by this payment`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-4 py-2.5">
                  <dt className="text-muted-foreground">{localize(k)}</dt>
                  <dd className="text-right font-semibold text-foreground">{localize(v)}</dd>
                </div>
              ))}
            </dl>
            {blocked && (
              <p role="alert" className="text-[13px] font-semibold text-destructive">
                {localize(reviewRoom?.paidThisMonth ? "This room is already paid." : "Not enough money in your wallet. Add money first.")}
              </p>
            )}
            <IosButton tone="primary" disabled={blocked} onClick={confirmPay}>
              {localize(review.kind === "kiosk" ? `Create ${money(reviewAmount)} voucher` : review.kind === "topup" ? `Add ${money(reviewAmount)}` : `Pay ${money(reviewAmount)}`)}
            </IosButton>
            <IosButton tone="gray" onClick={() => setSheet(review.kind === "topup" ? "method" : review.kind === "kiosk" ? "kiosk" : null)}>{tr("Back")}</IosButton>
          </div>
        )}
        {sheet === "recycle" && (
          <div className="space-y-4 pt-1">
            <IosSection header={tr("Select feeder / micro-hub")}>
              {CIRCULAR_HUBS.map((h) => (
                <IosRow
                  key={h.id}
                  onClick={() => setDropHub(h.id)}
                  icon={<Recycle className="size-4" />}
                  iconTone="forest"
                  title={localize(h.name)}
                  subtitle={localize(h.schedule)}
                  detail={localize(h.distanceLabel)}
                  selected={dropHub === h.id}
                />
              ))}
            </IosSection>

            <IosSection header={tr("Material & weight")}>
              {(Object.keys(RECYCLABLE_RATES) as MaterialType[]).map((mId) => {
                const tariff = RECYCLABLE_RATES[mId];
                return (
                  <IosRow
                    key={mId}
                    onClick={() => setDropMat(mId)}
                    title={localize(tariff.label)}
                    subtitle={tr("Saves {0} kg CO₂e / kg", tariff.co2FactorKgPerKg)}
                    detail={tr("{0}/kg", money(tariff.ratePerKgNgn))}
                    selected={dropMat === mId}
                  />
                );
              })}
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="text-[14px] font-medium text-foreground">{tr("Measured weight (kg)")}</span>
                <div className="flex gap-1.5">
                  {[2, 4, 8, 12].map((kg) => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => setDropKg(kg)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                        dropKg === kg ? "bg-primary text-white" : "bg-[#e5e5ea] text-foreground",
                      )}
                    >
                      {localize(kg)}{" "}{tr("kg")}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-[14px] font-medium text-foreground">{tr("Clean source-sorted load")}</p>
                  <p className="text-[12px] text-muted-foreground">{tr("Unsoiled loads receive full MRF buy-back credit")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDropClean((v) => !v)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-semibold",
                    dropClean ? "bg-[#248a3d] text-white" : "bg-[#d92d20] text-white",
                  )}
                >
                  {localize(dropClean ? "Clean Sort" : "Contaminated")}
                </button>
              </div>
            </IosSection>

            {dropStatusMsg && (
              <div role="status" className="rounded-[14px] bg-[#e8f3ec] p-3 text-[13px] font-medium text-[#12472e]">
                {localize(dropStatusMsg)}
              </div>
            )}

            <IosButton
              tone="primary"
              onClick={() => {
                const res = logCircularDrop(dropHub, dropMat, dropKg, dropClean);
                setDropStatusMsg(
                  res.earnedNgn > 0
                    ? `Credited +${money(res.earnedNgn)} (${res.weightKg}kg ${res.materialId}) to your wallet!`
                    : `Contaminated ${res.materialId} drop recorded at ₦0 — rinse/segregate before next drop.`,
                );
              }}
            >{tr("Credit")}{" "}{localize(dropClean ? money(Math.round(dropKg * RECYCLABLE_RATES[dropMat].ratePerKgNgn)) : "₦0 (Contaminated)")}{" "}{tr("to Wallet")}</IosButton>
          </div>
        )}
        {sheet === "kiosk" && (
          <div className="space-y-4 pt-1">
            <IosSection header={tr("Choose POS network")}>
              {(["Moniepoint", "OPay", "PalmPay"] as const).map((p) => (
                <IosRow
                  key={p}
                  onClick={() => setKioskProvider(p)}
                  icon={<Store className="size-4" />}
                  iconTone="ember"
                  title={tr("{0} Agent Kiosk", p)}
                  subtitle={tr("Pay physical Naira cash · Instant room DUID credit")}
                  selected={kioskProvider === p}
                />
              ))}
            </IosSection>
            <IosButton
              tone="primary"
              onClick={() => { setReview({ kind: "kiosk" }); setSheet("review"); }}
            >{tr("Review ₦750 cash voucher")}</IosButton>
            <Button asChild className="min-h-11 w-full bg-muted text-foreground hover:bg-muted/80"><a href={LAWMA_USSD_TEL}>{tr("Dial")}{" "}{localize(LAWMA_USSD_SHORTCODE)}</a></Button>
            {latestVoucher && (
              <div className="rounded-[16px] bg-white p-4 text-center ring-1 ring-black/[0.08]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{tr("Show code to")}{" "}{localize(latestVoucher.kioskNetwork)}
                </p>
                <p className="mt-1.5 font-mono text-[22px] font-bold tracking-wider text-primary">
                  {localize(latestVoucher.code)}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">{tr("Room")}{" "}{localize(latestVoucher.roomDuid)} · {localize(money(latestVoucher.amountNgn))} · {localize(latestVoucher.expiresLabel)}
                </p>
              </div>
            )}
          </div>
        )}

        {sheet === "ussd" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg bg-muted p-4 text-foreground">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">{tr("LAWMA Shortcode")}</p>
              <p className="mt-1 font-mono text-[26px] font-bold">{localize(LAWMA_USSD_SHORTCODE)}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{tr("No mobile data needed. Opens your phone’s dialler; carrier terms may apply.")}</p>
            </div>
            <Button asChild className="min-h-12 w-full"><a href={LAWMA_USSD_TEL}>{tr("Dial")}{" "}{localize(LAWMA_USSD_SHORTCODE)}</a></Button>
            <IosSection header={tr("Direct room USSD shortcuts")}>
              <IosRow
                title={tr("Pay monthly room share (₦750)")}
                subtitle={tr("Credited via airtime / mobile money wallet")}
                detail={localize(buildUssdDialString(compound.myRoomDuid, "pay"))}
              />
              <IosRow
                title={tr("Request Smart Bin / Green Bag roll")}
                subtitle={tr("Queued directly to your statutory Ward PSP")}
                detail={localize(buildUssdDialString(compound.myRoomDuid, "bin"))}
              />
              <IosRow
                title={tr("Report missed street sweep")}
                subtitle={tr("Logs SLA breach alert to LAWMA dispatch")}
                detail={localize(buildUssdDialString(compound.myRoomDuid, "missed"))}
              />
            </IosSection>
            <IosButton tone="gray" onClick={() => setSheet(null)}>{tr("Close")}</IosButton>
          </div>
        )}

        {sheet === "amount" && (
          <div className="space-y-5 pt-2">
            <div className="py-4 text-center">
              <p className="text-[13px] font-medium text-muted-foreground">{tr("Amount")}</p>
              <div className="no-field-box mt-2 flex items-baseline justify-center gap-1.5">
                <span aria-hidden="true" className="text-[24px] font-semibold leading-none text-muted-foreground/60">₦</span>
                <input
                  ref={amountInputRef}
                  value={amountText}
                  onChange={(e) => applyAmount(e.target.value)}
                  onFocus={() => {
                    // Keep the field above the on-screen keyboard without a jump.
                    window.setTimeout(() => amountInputRef.current?.scrollIntoView({ block: "nearest" }), 300);
                  }}
                  inputMode="numeric"
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="0"
                  aria-label={tr("Amount in naira")}
                  className="w-[7ch] max-w-full bg-transparent text-center text-[56px] font-extrabold leading-none tracking-tight text-foreground tabular-nums caret-ember outline-none placeholder:text-muted-foreground/30"
                />
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {localize(amount > 0 ? `${money(amount)} · type any amount or pick below` : "Type an amount or pick below")}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {amounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setAmountText(String(a));
                  }}
                  className={cn(
                    "min-h-[44px] rounded-[11px] text-[15px] font-semibold transition-all",
                    amount === a
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-foreground ring-1 ring-black/[0.06] hover:bg-white/80",
                  )}
                >
                  ₦{localize(a / 1000)}{tr("k")}</button>
              ))}
            </div>

            <IosButton tone="primary" disabled={amount < 100} onClick={() => setSheet("method")}>
              {localize(amount < 100 ? "Enter at least ₦100" : "Continue")}
            </IosButton>
          </div>
        )}

        {sheet === "method" && (
          <div className="space-y-4 pt-1">
            <IosSection header={tr("Choose payment method")}>
              {methods.map((m) => (
                <IosRow
                  key={m.id}
                  onClick={() => {
                    setReview({ kind: "topup", method: m.id });
                    setSheet("review");
                  }}
                  icon={<m.icon className="size-4" />}
                  iconTone={m.tone}
                  title={localize(m.id)}
                  subtitle={localize(m.sub)}
                  disclosure
                />
              ))}
            </IosSection>

            <IosButton tone="gray" onClick={() => setSheet("amount")}>{tr("Change amount")}</IosButton>
          </div>
        )}

        {sheet === "done" && (
          <div className="space-y-5 pt-3 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#248a3d]/15 text-[#17682c] animate-in zoom-in duration-300">
              <Check className="size-8" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[22px] font-bold tracking-tight text-foreground">{localize(money(amount))}{" "}{tr("added")}</p>
              <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">{tr("Available balance:")}{" "}{localize(money(model.balance))}
              </p>
            </div>
            <IosButton tone="primary" onClick={() => setSheet(null)}>{tr("Done")}</IosButton>
          </div>
        )}
      </IosSheet>
    </Phone>
  );
}
