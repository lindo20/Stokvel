"use client";

import { Fragment, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

const ROLE_OPTIONS = ["member", "treasurer", "secretary", "chairman", "admin"];
const STANDING_OPTIONS = ["good", "in_arrears", "suspended", "exited"];
const NAME_PATTERN = /^[A-Za-z ]{2,120}$/;

function money(value) {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function amountOwed(memberId, contributions) {
  return contributions
    .filter((item) => item.member_id === memberId && item.status !== "paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

// Everything an admin can do to a member's record: add one, edit one, and see
// the same financial picture that member would see of themselves (their
// contributions and payouts), across every club the admin owns.
export default function AdminMembersPanel({ clubs, members, contributions, payouts, onRefresh }) {
  const supabase = getSupabaseBrowserClient();

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", stokvel_id: "", role: "member", standing: "good" });
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");

  const [expandedId, setExpandedId] = useState("");
  const [saving, setSaving] = useState(false);

  function clubName(id) {
    return clubs.find((club) => club.id === id)?.name || "Unknown club";
  }

  function startAdd() {
    setAddForm({ full_name: "", stokvel_id: clubs[0]?.id || "", role: "member", standing: "good" });
    setAddError("");
    setAdding(true);
  }

  async function submitAdd(event) {
    event.preventDefault();
    const fullName = addForm.full_name.trim();
    if (!NAME_PATTERN.test(fullName)) {
      setAddError("Full name can contain letters and spaces only (2-120 characters).");
      return;
    }
    if (!addForm.stokvel_id) {
      setAddError("Choose a club.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("members").insert({
      full_name: fullName,
      stokvel_id: addForm.stokvel_id,
      role: addForm.role,
      standing: addForm.standing,
    });
    setSaving(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setAdding(false);
    await onRefresh?.();
  }

  function startEdit(member) {
    setExpandedId("");
    setEditingId(member.id);
    setEditForm({ full_name: member.full_name, stokvel_id: member.stokvel_id, role: member.role, standing: member.standing });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm(null);
    setEditError("");
  }

  async function submitEdit(event, memberId) {
    event.preventDefault();
    const fullName = editForm.full_name.trim();
    if (!NAME_PATTERN.test(fullName)) {
      setEditError("Full name can contain letters and spaces only (2-120 characters).");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("members")
      .update({ full_name: fullName, stokvel_id: editForm.stokvel_id, role: editForm.role, standing: editForm.standing })
      .eq("id", memberId);
    setSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    cancelEdit();
    await onRefresh?.();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#647b8f]">{members.length} member{members.length === 1 ? "" : "s"} across {clubs.length} club{clubs.length === 1 ? "" : "s"}</p>
        {!adding && (
          <button type="button" onClick={startAdd} disabled={clubs.length === 0} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:cursor-not-allowed disabled:opacity-50">
            + Add member
          </button>
        )}
      </div>

      {clubs.length === 0 && <p className="mt-3 text-sm text-[#647b8f]">Create a club before adding members.</p>}

      {adding && (
        <form onSubmit={submitAdd} className="mt-4 grid gap-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-[#647b8f]">
            Full name
            <input
              value={addForm.full_name}
              onChange={(event) => setAddForm({ ...addForm, full_name: event.target.value })}
              placeholder="Jane Dlamini"
              className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm text-[#102a43] outline-none focus:border-[#1f5f8b]"
            />
          </label>
          <label className="text-sm text-[#647b8f]">
            Club
            <select value={addForm.stokvel_id} onChange={(event) => setAddForm({ ...addForm, stokvel_id: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[#647b8f]">
            Role
            <select value={addForm.role} onChange={(event) => setAddForm({ ...addForm, role: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label className="text-sm text-[#647b8f]">
            Standing
            <select value={addForm.standing} onChange={(event) => setAddForm({ ...addForm, standing: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
              {STANDING_OPTIONS.map((standing) => <option key={standing} value={standing}>{standing.replace("_", " ")}</option>)}
            </select>
          </label>
          {addError && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{addError}</p>}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{saving ? "Saving..." : "Save member"}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-[#173b56]/20 px-4 py-2 text-sm font-semibold text-[#647b8f] transition hover:bg-[#eef6fb]">Cancel</button>
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No members yet.</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Member</th>
                <th className="px-5 py-4 font-semibold">Club</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 font-semibold">Standing</th>
                <th className="px-5 py-4 font-semibold text-right">Amount owed</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {members.map((member) => {
                if (editingId === member.id) {
                  return (
                    <tr key={member.id} className="bg-[#eef6fb]">
                      <td colSpan={6} className="px-5 py-4">
                        <form onSubmit={(event) => submitEdit(event, member.id)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                          <label className="text-xs text-[#647b8f]">
                            Full name
                            <input value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Club
                            <select value={editForm.stokvel_id} onChange={(event) => setEditForm({ ...editForm, stokvel_id: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
                              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                            </select>
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Role
                            <select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
                              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Standing
                            <select value={editForm.standing} onChange={(event) => setEditForm({ ...editForm, standing: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
                              {STANDING_OPTIONS.map((standing) => <option key={standing} value={standing}>{standing.replace("_", " ")}</option>)}
                            </select>
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="rounded-lg bg-[#1f5f8b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                            <button type="button" onClick={cancelEdit} className="rounded-lg border border-[#173b56]/20 px-3 py-2 text-xs font-semibold text-[#647b8f] transition hover:bg-white">Cancel</button>
                          </div>
                          {editError && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-5">{editError}</p>}
                        </form>
                      </td>
                    </tr>
                  );
                }

                const isExpanded = expandedId === member.id;
                const owed = amountOwed(member.id, contributions);
                const memberContributions = contributions.filter((item) => item.member_id === member.id);
                const memberPayouts = payouts.filter((item) => item.member_id === member.id);

                return (
                  <Fragment key={member.id}>
                    <tr className="hover:bg-[#eef6fb]">
                      <td className="px-5 py-4">{member.full_name}</td>
                      <td className="px-5 py-4 text-[#647b8f]">{clubName(member.stokvel_id)}</td>
                      <td className="px-5 py-4 capitalize text-[#647b8f]">{member.role}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold capitalize text-[#2775a6]">{member.standing.replace("_", " ")}</span></td>
                      <td className={`px-5 py-4 text-right font-mono ${owed > 0 ? "text-red-600" : "text-[#647b8f]"}`}>{money(owed)}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setExpandedId(isExpanded ? "" : member.id)} className="mr-3 text-xs font-semibold text-[#2775a6] hover:underline">{isExpanded ? "Hide" : "Details"}</button>
                        <button type="button" onClick={() => startEdit(member)} className="text-xs font-semibold text-[#2775a6] hover:underline">Edit</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#f5f9fc]">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#647b8f]">Contributions</p>
                              {memberContributions.length ? (
                                <ul className="mt-2 space-y-1 text-sm">
                                  {memberContributions.map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-3">
                                      <span>{item.due_date}</span>
                                      <span className="capitalize text-[#647b8f]">{item.status}</span>
                                      <span className="font-mono">{money(item.amount)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="mt-2 text-sm text-[#647b8f]">No contributions recorded.</p>}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#647b8f]">Payouts</p>
                              {memberPayouts.length ? (
                                <ul className="mt-2 space-y-1 text-sm">
                                  {memberPayouts.map((item) => (
                                    <li key={item.id} className="flex items-center justify-between gap-3">
                                      <span>{item.scheduled_for || "No date"}</span>
                                      <span className="capitalize text-[#647b8f]">{item.status}</span>
                                      <span className="font-mono">{money(item.amount)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : <p className="mt-2 text-sm text-[#647b8f]">No payouts recorded.</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
