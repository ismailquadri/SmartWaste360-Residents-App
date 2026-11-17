import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  Clock,
  CreditCard,
  Gavel,
  Landmark,
  Lock,
  Plus,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Wallet as WalletIcon,
} from "lucide-react";
import { useState } from "react";
import { PageTitle, Phone } from "@/components/app";
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
  createDefaultCompound,
  evaluateCompoundQuorum,
  type KioskProvider,
  type KioskVoucher,
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

const filterOptions = [
  { value: "all" as const, label: "All" },
  { value: "in" as const, label: "Money in" },
  { value: "out" as const, label: "Money out" },
] as const;

function WalletPage() {
  const { model, topUp, settleRoom, applySec44Shield, createPosVoucher } = useStore();
  const [sheet, setSheet] = useState<null | "amount" | "method" | "done" | "kiosk" | "ussd">(null);
  const [amount, setAmount] = useState<number>(5000);
  const [filter, setFilter] = useState<Filter>("all");
  const [kioskProvider, setKioskProvider] = useState<KioskProvider>("Moniepoint");
  const [latestVoucher, setLatestVoucher] = useState<KioskVoucher | null>(
    () => model.kioskVouchers?.[0] ?? null,
  );
  const [sec44AppliedMsg, setSec44AppliedMsg] = useState<string | null>(null);

  const isIn = (k: string) => k === "credit" || k === "released";
  const entries = model.entries.filter((e) => filter === "all" || (filter === "in") === isIn(e.kind));
  const [whole, kobo] = money(model.balance).split(".");
  const addedThisMonth = model.entries
    .filter((e) => e.kind === "credit")
    .reduce((s, e) => s + e.amount, 0);

  const compound = model.compound ?? createDefaultCompound();
  const quorum = evaluateCompoundQuorum(compound.rooms, compound.quorumThresholdPct);
  const activeVouchers = model.kioskVouchers ?? [];

  return (
    <Phone>
      <PageTitle title="Wallet & Compound" sub="Room DUID virtual ledger, offline POS kiosks, and Sec. 44 shield." />

      <section className="wallet-balance" aria-label="Wallet balance">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/75">
              Room Virtual Account · {compound.myRoomDuid.slice(-4)}
            </p>
            <p className="mt-1.5 text-[40px] font-bold leading-none tracking-tight tabular-nums">
              {whole}
              {kobo !== undefined && <span className="text-2xl text-white/60">.{kobo}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheet("amount")}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-primary shadow-sm hover:bg-white/95"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            Add
          </button>
        </div>

        <div className="wallet-summary">
          <div>
            <span className="text-[12px] text-white/75">Money added</span>
            <p className="tabular-nums">{money(addedThisMonth)}</p>
          </div>
          <div className="text-right">
            <span className="text-[12px] text-white/75">Held in PSP escrow</span>
            <p className="tabular-nums">{money(model.reserved)}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-6">
        <IosSection
          header="Compound Quorum & Drum Access"
          footer={
            quorum.isQuarantined
              ? "Below 60% payment quorum: communal drum is quarantined. Paying residents retain disposal via My Green Collection Bags QR."
              : "60%+ quorum reached: communal compound drums are open for routine PSP lift."
          }
        >
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-foreground">{compound.compoundName}</p>
                <p className="text-[12px] text-muted-foreground">Cadastre {compound.cadastreId}</p>
              </div>
              <IosBadge>{quorum.isQuarantined ? "Quarantined" : "Open"}</IosBadge>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[12px] font-semibold">
                <span className={quorum.isQuarantined ? "text-[#b42318]" : "text-[#17682c]"}>
                  {quorum.paidCount}/{quorum.totalRooms} Rooms Settled ({quorum.quorumPct}%)
                </span>
                <span className="text-muted-foreground">Required: {compound.quorumThresholdPct}%</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#e5e5ea]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    quorum.isQuarantined ? "bg-[#d92d20]" : "bg-[#17593a]",
                  )}
                  style={{ width: `${quorum.quorumPct}%` }}
                />
              </div>
            </div>

            {quorum.isQuarantined && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#fef3f2] p-3 text-[12px] text-[#912018]">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                  Communal drum locked (&lt;60%). You still qualify for direct bag lift.
                </span>
                <Link
                  to="/bins"
                  className="inline-flex items-center gap-1 rounded-full bg-[#17593a] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  <QrCode className="size-3" aria-hidden="true" />
                  My Green Bags
                </Link>
              </div>
            )}
          </div>

          <IosRow
            icon={<ShieldCheck className="size-4" />}
            iconTone="forest"
            title="Tenancy Law Sec. 44 Shield Active"
            subtitle={`₦${compound.prevTenantArrearsClearedNgn.toLocaleString("en-NG")} outgoing tenant debt wiped on Rm 02 move-in`}
            trailing={<IosBadge>Protected</IosBadge>}
          />

          {quorum.mobileCourtForm1Rooms.length > 0 && (
            <IosRow
              icon={<Gavel className="size-4" />}
              iconTone="red"
              title={`Mobile Court Form 1 Notice (${quorum.mobileCourtForm1Rooms.length} rooms >60d)`}
              subtitle={quorum.mobileCourtForm1Rooms.map((r) => `${r.roomLabel} (${r.arrearsDays}d)`).join(" · ")}
              trailing={<IosBadge>Urgent</IosBadge>}
            />
          )}
        </IosSection>

        <IosSection header="Room-by-Room Virtual Ledger" footer="Tap Settle ₦750 on an unpaid room to test quorum unlock at 60%.">
          {compound.rooms.map((r) => (
            <IosRow
              key={r.duid}
              icon={<Building2 className="size-4" />}
              iconTone={r.paidThisMonth ? "green" : r.arrearsDays > 60 ? "red" : "ember"}
              title={`${r.roomLabel} · ${r.tenantName}`}
              subtitle={
                r.paidThisMonth
                  ? `${r.virtualAccount} · Bag QR ${r.bagQrCode.slice(-6)}`
                  : `${r.virtualAccount} · ${r.arrearsDays}d arrears`
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
                        className="rounded-full bg-[#e8f3ec] px-2.5 py-1 text-[11px] font-semibold text-[#17593a] hover:bg-[#d6ebdf]"
                      >
                        Sec. 44
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => settleRoom(r.duid)}
                      className="rounded-full bg-[#17593a] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#12472e]"
                    >
                      Pay {money(r.monthlyShareNgn)}
                    </button>
                  </div>
                )
              }
            />
          ))}
        </IosSection>

        {sec44AppliedMsg && (
          <div role="status" className="rounded-[14px] bg-[#e8f3ec] p-3 text-[13px] font-medium text-[#12472e]">
            {sec44AppliedMsg}
          </div>
        )}

        <IosSection header="Offline Cash & USSD Channels" footer="Unbanked or low-data residents pay zero transfer fees via Kiosk vouchers or *384*7006#.">
          <IosRow
            onClick={() => setSheet("kiosk")}
            icon={<Store className="size-4" />}
            iconTone="ember"
            title="Pay Cash at POS Kiosk Agent"
            subtitle="Generate POS-VOUCH code for Moniepoint, OPay, or PalmPay"
            detail={activeVouchers[0]?.code}
            disclosure
          />
          <IosRow
            onClick={() => setSheet("ussd")}
            icon={<Smartphone className="size-4" />}
            iconTone="blue"
            title="Offline USSD Quick Dial (*384*7006#)"
            subtitle="Works with 0MB mobile data on MTN, Airtel, Glo & 9mobile"
            disclosure
          />
        </IosSection>
      </div>

      <div className="mt-6">
        <IosSegmentedControl
          label="Filter transactions"
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <div className="mt-4">
        {entries.length === 0 ? (
          <IosEmpty icon={<WalletIcon className="size-5" />} title="No transactions yet">
            Top up your wallet or settle a room share above.
          </IosEmpty>
        ) : (
          <IosSection header="Transactions" footer="Demo ledger — room settlements update compound quorum immediately.">
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
                  title={e.title}
                  subtitle={e.time}
                  trailing={
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums",
                        credit ? "text-[#17682c]" : "text-foreground",
                      )}
                    >
                      {credit ? "+" : "−"}
                      {money(e.amount)}
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
        title={
          sheet === "amount"
            ? "Add money"
            : sheet === "method"
              ? `Pay ${money(amount)}`
              : sheet === "kiosk"
                ? "POS Kiosk Cash Voucher"
                : sheet === "ussd"
                  ? "Offline USSD (*384*7006#)"
                  : "Top-up complete"
        }
      >
        {sheet === "kiosk" && (
          <div className="space-y-4 pt-1">
            <IosSection header="Choose POS network">
              {(["Moniepoint", "OPay", "PalmPay"] as const).map((p) => (
                <IosRow
                  key={p}
                  onClick={() => setKioskProvider(p)}
                  icon={<Store className="size-4" />}
                  iconTone="ember"
                  title={`${p} Agent Kiosk`}
                  subtitle="Pay physical Naira cash · Instant room DUID credit"
                  selected={kioskProvider === p}
                />
              ))}
            </IosSection>
            <IosButton
              tone="primary"
              onClick={() => {
                const v = createPosVoucher(kioskProvider, compound.myRoomDuid, 750);
                setLatestVoucher(v);
              }}
            >
              Generate ₦750 Cash Voucher
            </IosButton>
            {latestVoucher && (
              <div className="rounded-[16px] bg-white p-4 text-center ring-1 ring-black/[0.08]">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Show code to {latestVoucher.kioskNetwork}
                </p>
                <p className="mt-1.5 font-mono text-[22px] font-bold tracking-wider text-[#17593a]">
                  {latestVoucher.code}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Room {latestVoucher.roomDuid} · {money(latestVoucher.amountNgn)} · {latestVoucher.expiresLabel}
                </p>
              </div>
            )}
          </div>
        )}

        {sheet === "ussd" && (
          <div className="space-y-4 pt-1">
            <div className="rounded-[16px] bg-[#17593a] p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">Zero-Data LAWMA Shortcode</p>
              <p className="mt-1 font-mono text-[26px] font-bold tracking-wide">*384*7006#</p>
              <p className="mt-1 text-[13px] text-white/85">Works on feature phones with zero airtime or mobile internet.</p>
            </div>
            <IosSection header="Direct room USSD shortcuts">
              <IosRow
                title="Pay monthly room share (₦750)"
                subtitle="Credited via airtime / mobile money wallet"
                detail={buildUssdDialString(compound.myRoomDuid, "pay")}
              />
              <IosRow
                title="Request Smart Bin / Green Bag roll"
                subtitle="Queued directly to your statutory Ward PSP"
                detail={buildUssdDialString(compound.myRoomDuid, "bin")}
              />
              <IosRow
                title="Report missed street sweep"
                subtitle="Logs SLA breach alert to LAWMA dispatch"
                detail={buildUssdDialString(compound.myRoomDuid, "missed")}
              />
            </IosSection>
            <IosButton tone="gray" onClick={() => setSheet(null)}>Close</IosButton>
          </div>
        )}

        {sheet === "amount" && (
          <div className="space-y-5 pt-2">
            <div className="ios-group py-6 text-center">
              <p className="text-[13px] font-medium text-muted-foreground">Amount</p>
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                {money(amount)}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {amounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={cn(
                    "min-h-[44px] rounded-[11px] text-[15px] font-semibold transition-all",
                    amount === a
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-foreground ring-1 ring-black/[0.06] hover:bg-white/80",
                  )}
                >
                  ₦{a / 1000}k
                </button>
              ))}
            </div>

            <IosButton tone="primary" onClick={() => setSheet("method")}>
              Continue
            </IosButton>
          </div>
        )}

        {sheet === "method" && (
          <div className="space-y-4 pt-1">
            <IosSection header="Choose payment method">
              {methods.map((m) => (
                <IosRow
                  key={m.id}
                  onClick={() => {
                    topUp(amount, m.id);
                    setSheet("done");
                  }}
                  icon={<m.icon className="size-4" />}
                  iconTone={m.tone}
                  title={m.id}
                  subtitle={m.sub}
                  disclosure
                />
              ))}
            </IosSection>

            <IosButton tone="gray" onClick={() => setSheet("amount")}>
              Change amount
            </IosButton>
          </div>
        )}

        {sheet === "done" && (
          <div className="space-y-5 pt-3 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#248a3d]/15 text-[#17682c] animate-in zoom-in duration-300">
              <Check className="size-8" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[22px] font-bold tracking-tight text-foreground">{money(amount)} added</p>
              <p className="mt-1 text-[15px] text-muted-foreground tabular-nums">
                Available balance: {money(model.balance)}
              </p>
            </div>
            <IosButton tone="primary" onClick={() => setSheet(null)}>
              Done
            </IosButton>
          </div>
        )}
      </IosSheet>
    </Phone>
  );
}
