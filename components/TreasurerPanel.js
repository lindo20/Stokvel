"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { recordContributionPayment, initiatePayout, approvePayout } from "../lib/treasury";

const TABS = ["Dashboard", "Contributions", "Ledger", "Payouts", "Reconciliation"];

function money(value) {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

export default function TreasurerPanel({ clubId, userId, members, contributions, payouts, ledger, reconciliations, onRefresh }) {
  const [tab, setTab] = useState("Dashboard");
  const [error, setError] = useState("");

  const memberName = (id) => members.find((m) => m.id === id)?.full_name || "Unknown member";
  const officerName = (uid) => {
    if (!uid) return "—";
    if (uid === userId) return "You";
    return members.find((m) => m.user_id === uid)?.full_name || "Another officer";
  };

  const poolBalance = ledger[0]?.resulting_balance ?? 0;

  async function runAction(action) {
    setError("");
    try {
      await action();
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[#1d4f73]/10 pb-3">
        {TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === label ? "bg-[#1f5f8b] text-white" : "bg-white/80 text-[#647b8f] hover:bg-[#eef6fb]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6">
        {tab === "Dashboard" && <DashboardTab contributions={contributions} payouts={payouts} ledger={ledger} reconciliations={reconciliations} poolBalance={poolBalance} memberName={memberName} />}
        {tab === "Contributions" && <ContributionsTab contributions={contributions} memberName={memberName} onRecord={(id, amount, description) => runAction(() => recordContributionPayment(id, amount, description))} />}
        {tab === "Ledger" && <LedgerTab ledger={ledger} poolBalance={poolBalance} />}
        {tab === "Payouts" && (
          <PayoutsTab
            clubId={clubId}
            userId={userId}
            members={members}
            payouts={payouts}
            poolBalance={poolBalance}
            memberName={memberName}
            officerName={officerName}
            onInitiate={(memberId, amount, scheduledFor) => runAction(() => initiatePayout(clubId, memberId, amount, scheduledFor))}
            onApprove={(payoutId) => runAction(() => approvePayout(payoutId))}
          />
        )}
        {tab === "Reconciliation" && <ReconciliationTab clubId={clubId} poolBalance={poolBalance} reconciliations={reconciliations} onSaved={onRefresh} setError={setError} />}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5">
      <p className="text-xs uppercase tracking-wider text-[#647b8f]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone || ""}`}>{value}</p>
    </div>
  );
}

function DashboardTab({ contributions, payouts, ledger, reconciliations, poolBalance, memberName }) {
  const totalContributions = contributions.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
  const outstanding = contributions.reduce((sum, c) => sum + Math.max(Number(c.amount) - Number(c.amount_paid || 0), 0), 0);
  const totalPenalties = ledger.filter((l) => l.entry_type === "penalty").reduce((sum, l) => sum + Number(l.amount), 0);
  const pendingPayouts = payouts.filter((p) => p.status === "initiated" || p.status === "pending").length;
  const latestReconciliation = reconciliations[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pool balance" value={money(poolBalance)} />
        <Stat label="Total contributions" value={money(totalContributions)} />
        <Stat label="Outstanding contributions" value={money(outstanding)} tone={outstanding > 0 ? "text-red-600" : ""} />
        <Stat label="Penalties" value={money(totalPenalties)} />
        <Stat label="Pending payouts" value={pendingPayouts} />
        <Stat
          label="Reconciliation status"
          value={latestReconciliation ? (Number(latestReconciliation.difference) === 0 ? "Balanced" : `${money(latestReconciliation.difference)} gap`) : "Not yet reconciled"}
          tone={latestReconciliation && Number(latestReconciliation.difference) !== 0 ? "text-red-600" : ""}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#647b8f]">Recent transactions</p>
        {ledger.length === 0 ? (
          <p className="text-sm text-[#647b8f]">No ledger entries yet.</p>
        ) : (
          <ul className="divide-y divide-[#1d4f73]/10 rounded-xl border border-[#1d4f73]/10 bg-white/80">
            {ledger.slice(0, 5).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>{formatDate(entry.created_at)} · <span className="capitalize text-[#647b8f]">{entry.entry_type}</span> · {entry.description}</span>
                <span className={`font-mono ${Number(entry.amount) < 0 ? "text-red-600" : ""}`}>{money(entry.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ContributionsTab({ contributions, memberName, onRecord }) {
  const [recordingId, setRecordingId] = useState("");
  const [amount, setAmount] = useState("");

  function startRecord(contribution) {
    setRecordingId(contribution.id);
    setAmount(String(Math.max(Number(contribution.amount) - Number(contribution.amount_paid || 0), 0)));
  }

  async function submitRecord(id) {
    await onRecord(id, Number(amount), `Contribution payment for ${memberName(contributions.find((c) => c.id === id)?.member_id)}`);
    setRecordingId("");
    setAmount("");
  }

  if (!contributions.length) {
    return <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No contributions recorded for this club yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
          <tr>
            <th className="px-5 py-4 font-semibold">Member</th>
            <th className="px-5 py-4 font-semibold text-right">Expected</th>
            <th className="px-5 py-4 font-semibold text-right">Paid</th>
            <th className="px-5 py-4 font-semibold text-right">Outstanding</th>
            <th className="px-5 py-4 font-semibold">Status</th>
            <th className="px-5 py-4 font-semibold">Due</th>
            <th className="px-5 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1d4f73]/10">
          {contributions.map((c) => {
            const outstanding = Math.max(Number(c.amount) - Number(c.amount_paid || 0), 0);
            return (
              <tr key={c.id} className="hover:bg-[#eef6fb]">
                <td className="px-5 py-4">{memberName(c.member_id)}</td>
                <td className="px-5 py-4 text-right font-mono">{money(c.amount)}</td>
                <td className="px-5 py-4 text-right font-mono">{money(c.amount_paid)}</td>
                <td className={`px-5 py-4 text-right font-mono ${outstanding > 0 ? "text-red-600" : ""}`}>{money(outstanding)}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold capitalize text-[#2775a6]">{c.status}</span></td>
                <td className="px-5 py-4 text-[#647b8f]">{formatDate(c.due_date)}</td>
                <td className="px-5 py-4 text-right">
                  {recordingId === c.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24 rounded-lg border border-[#173b56]/20 bg-white px-2 py-1 text-sm outline-none focus:border-[#1f5f8b]" />
                      <button type="button" onClick={() => submitRecord(c.id)} className="text-xs font-semibold text-[#2775a6] hover:underline">Save</button>
                      <button type="button" onClick={() => setRecordingId("")} className="text-xs font-semibold text-[#647b8f] hover:underline">Cancel</button>
                    </div>
                  ) : outstanding > 0 ? (
                    <button type="button" onClick={() => startRecord(c)} className="text-xs font-semibold text-[#2775a6] hover:underline">Record payment</button>
                  ) : (
                    <span className="text-xs text-[#647b8f]">Settled</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LedgerTab({ ledger, poolBalance }) {
  return (
    <div>
      <p className="mb-4 text-sm text-[#647b8f]">Pool balance: <span className="font-semibold text-[#102a43]">{money(poolBalance)}</span> — append-only; corrections are made with reversing entries, never edits.</p>
      {ledger.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No ledger entries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Description</th>
                <th className="px-5 py-4 font-semibold text-right">Amount</th>
                <th className="px-5 py-4 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#eef6fb]">
                  <td className="px-5 py-4">{formatDate(entry.created_at)}</td>
                  <td className="px-5 py-4 capitalize text-[#647b8f]">{entry.entry_type}</td>
                  <td className="px-5 py-4">{entry.description}</td>
                  <td className={`px-5 py-4 text-right font-mono ${Number(entry.amount) < 0 ? "text-red-600" : ""}`}>{money(entry.amount)}</td>
                  <td className="px-5 py-4 text-right font-mono">{money(entry.resulting_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PayoutsTab({ clubId, userId, members, payouts, poolBalance, memberName, officerName, onInitiate, onApprove }) {
  const [form, setForm] = useState({ memberId: members[0]?.id || "", amount: "", scheduledFor: "" });

  async function submit(event) {
    event.preventDefault();
    if (!form.memberId || !form.amount) return;
    await onInitiate(form.memberId, Number(form.amount), form.scheduledFor || null);
    setForm({ memberId: members[0]?.id || "", amount: "", scheduledFor: "" });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5 sm:grid-cols-4 sm:items-end">
        <label className="text-sm text-[#647b8f]">
          Member
          <select value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </label>
        <label className="text-sm text-[#647b8f]">
          Amount
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={`Max ${money(poolBalance)}`} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
        </label>
        <label className="text-sm text-[#647b8f]">
          Scheduled for
          <input type="date" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
        </label>
        <button type="submit" disabled={!members.length} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">Initiate payout</button>
      </form>

      {payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No payouts in the queue.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Member</th>
                <th className="px-5 py-4 font-semibold text-right">Amount</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Initiated by</th>
                <th className="px-5 py-4 font-semibold">Approved by</th>
                <th className="px-5 py-4 font-semibold">Scheduled</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-[#eef6fb]">
                  <td className="px-5 py-4">{memberName(p.member_id)}</td>
                  <td className="px-5 py-4 text-right font-mono">{money(p.amount)}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold capitalize text-[#2775a6]">{p.status}</span></td>
                  <td className="px-5 py-4 text-[#647b8f]">{officerName(p.initiated_by)}</td>
                  <td className="px-5 py-4 text-[#647b8f]">{officerName(p.approved_by)}</td>
                  <td className="px-5 py-4 text-[#647b8f]">{formatDate(p.scheduled_for)}</td>
                  <td className="px-5 py-4 text-right">
                    {p.status === "initiated" && p.initiated_by !== userId ? (
                      <button type="button" onClick={() => onApprove(p.id)} className="text-xs font-semibold text-[#2775a6] hover:underline">Approve</button>
                    ) : p.status === "initiated" ? (
                      <span className="text-xs text-[#647b8f]">Awaiting another officer</span>
                    ) : (
                      <span className="text-xs text-[#647b8f]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReconciliationTab({ clubId, poolBalance, reconciliations, onSaved, setError }) {
  const [bankBalance, setBankBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (bankBalance === "") return;
    setSaving(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const difference = Number(bankBalance) - Number(poolBalance);
    const { error } = await supabase.from("reconciliations").insert({
      stokvel_id: clubId,
      ledger_balance: poolBalance,
      bank_balance: Number(bankBalance),
      difference,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setBankBalance("");
    setNotes("");
    await onSaved?.();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5 sm:grid-cols-3 sm:items-end">
        <div className="text-sm text-[#647b8f]">
          Ledger balance
          <p className="mt-1 text-lg font-semibold text-[#102a43]">{money(poolBalance)}</p>
        </div>
        <label className="text-sm text-[#647b8f]">
          Bank balance
          <input type="number" step="0.01" value={bankBalance} onChange={(e) => setBankBalance(e.target.value)} required className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
        </label>
        <label className="text-sm text-[#647b8f] sm:col-span-1">
          Notes (optional)
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50 sm:col-span-3 sm:w-fit">{saving ? "Saving..." : "Record reconciliation"}</button>
      </form>

      {reconciliations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No reconciliations recorded yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold text-right">Ledger</th>
                <th className="px-5 py-4 font-semibold text-right">Bank</th>
                <th className="px-5 py-4 font-semibold text-right">Difference</th>
                <th className="px-5 py-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {reconciliations.map((r) => (
                <tr key={r.id} className="hover:bg-[#eef6fb]">
                  <td className="px-5 py-4">{formatDate(r.created_at)}</td>
                  <td className="px-5 py-4 text-right font-mono">{money(r.ledger_balance)}</td>
                  <td className="px-5 py-4 text-right font-mono">{money(r.bank_balance)}</td>
                  <td className={`px-5 py-4 text-right font-mono ${Number(r.difference) !== 0 ? "text-red-600" : ""}`}>{money(r.difference)}</td>
                  <td className="px-5 py-4 text-[#647b8f]">{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
