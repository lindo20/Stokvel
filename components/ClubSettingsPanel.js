"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

const NAME_PATTERN = /^.{2,120}$/;

export default function ClubSettingsPanel({ clubs, ownerId, onRefresh }) {
  const supabase = getSupabaseBrowserClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function createClub(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setError("Club name must be 2-120 characters.");
      return;
    }
    setSaving(true);
    setError("");
    const { error } = await supabase.from("stokvel").insert({ owner_id: ownerId, name: trimmed, status: "active" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    await onRefresh?.();
  }

  async function toggleStatus(club) {
    setBusyId(club.id);
    const nextStatus = club.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("stokvel").update({ status: nextStatus }).eq("id", club.id);
    setBusyId("");
    if (error) {
      setError(error.message);
      return;
    }
    await onRefresh?.();
  }

  return (
    <div>
      <form onSubmit={createClub} className="flex flex-wrap items-end gap-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5">
        <label className="flex-1 text-sm text-[#647b8f]">
          Club name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sandton Savings Circle" className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm text-[#102a43] outline-none focus:border-[#1f5f8b]" />
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{saving ? "Creating..." : "+ Create club"}</button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {clubs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">You don&apos;t own any clubs yet. Create one above — new members will be able to pick it at sign-up once it&apos;s active.</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Club</th>
                <th className="px-5 py-4 font-semibold">Members</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {clubs.map((club) => (
                <tr key={club.id} className="hover:bg-[#eef6fb]">
                  <td className="px-5 py-4">{club.name}</td>
                  <td className="px-5 py-4 text-[#647b8f]">{club.member_count}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${club.status === "active" ? "bg-[#2775a6]/10 text-[#2775a6]" : "bg-red-400/10 text-red-700"}`}>{club.status}</span></td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" onClick={() => toggleStatus(club)} disabled={busyId === club.id} className="text-xs font-semibold text-[#2775a6] hover:underline disabled:opacity-50">
                      {busyId === club.id ? "Saving..." : club.status === "active" ? "Suspend" : "Reactivate"}
                    </button>
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
