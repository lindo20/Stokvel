"use client";

import { Fragment, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { publishAnnouncement, sendPendingEmails } from "../lib/notifications";

const CATEGORY_OPTIONS = ["general", "meeting", "contribution", "payout"];
const AUDIENCE_OPTIONS = [
  { value: "all", label: "All members" },
  { value: "members", label: "Members only" },
  { value: "officers", label: "Officers only" },
];
const CHANNEL_OPTIONS = [
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
];

const emptyForm = (clubId) => ({ title: "", body: "", stokvel_id: clubId, category: "general", audience: "all", channels: ["in_app"] });

function toggleChannel(channels, value) {
  return channels.includes(value) ? channels.filter((c) => c !== value) : [...channels, value];
}

// Everything an authorised officer can do with announcements: draft one,
// edit it before it goes out, publish it (which fans out delivery records
// and attempts email), and see + retry the delivery outcomes.
export default function AdminAnnouncementsPanel({ clubs, announcements, members, onRefresh }) {
  const supabase = getSupabaseBrowserClient();

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm(clubs[0]?.id || ""));
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");

  const [expandedId, setExpandedId] = useState("");
  const [deliveries, setDeliveries] = useState([]);
  const [reportError, setReportError] = useState("");

  const [busyId, setBusyId] = useState("");

  function clubName(id) {
    return clubs.find((club) => club.id === id)?.name || "Unknown club";
  }

  function startAdd() {
    setAddForm(emptyForm(clubs[0]?.id || ""));
    setAddError("");
    setAdding(true);
  }

  async function submitAdd(event) {
    event.preventDefault();
    if (!addForm.title.trim() || !addForm.body.trim()) {
      setAddError("Title and message are required.");
      return;
    }
    if (!addForm.stokvel_id) {
      setAddError("Choose a club.");
      return;
    }
    if (!addForm.channels.length) {
      setAddError("Choose at least one delivery channel.");
      return;
    }
    setBusyId("adding");
    const { error } = await supabase.from("announcements").insert({
      stokvel_id: addForm.stokvel_id,
      title: addForm.title.trim(),
      body: addForm.body.trim(),
      category: addForm.category,
      audience: addForm.audience,
      channels: addForm.channels,
    });
    setBusyId("");
    if (error) {
      setAddError(error.message);
      return;
    }
    setAdding(false);
    await onRefresh?.();
  }

  function startEdit(announcement) {
    setExpandedId("");
    setEditingId(announcement.id);
    setEditForm({
      title: announcement.title,
      body: announcement.body,
      stokvel_id: announcement.stokvel_id,
      category: announcement.category,
      audience: announcement.audience,
      channels: announcement.channels,
    });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditForm(null);
    setEditError("");
  }

  async function submitEdit(event, id) {
    event.preventDefault();
    if (!editForm.title.trim() || !editForm.body.trim()) {
      setEditError("Title and message are required.");
      return;
    }
    if (!editForm.channels.length) {
      setEditError("Choose at least one delivery channel.");
      return;
    }
    setBusyId(id);
    const { error } = await supabase
      .from("announcements")
      .update({
        title: editForm.title.trim(),
        body: editForm.body.trim(),
        stokvel_id: editForm.stokvel_id,
        category: editForm.category,
        audience: editForm.audience,
        channels: editForm.channels,
      })
      .eq("id", id);
    setBusyId("");
    if (error) {
      setEditError(error.message);
      return;
    }
    cancelEdit();
    await onRefresh?.();
  }

  async function publish(announcement) {
    setBusyId(announcement.id);
    try {
      await publishAnnouncement(announcement, members);
      await onRefresh?.();
    } catch (error) {
      setAddError(error.message);
    }
    setBusyId("");
  }

  async function loadReport(announcementId) {
    setReportError("");
    const { data, error } = await supabase
      .from("notification_deliveries")
      .select("id, member_id, channel, status, attempts, error")
      .eq("announcement_id", announcementId);
    if (error) {
      setReportError(error.message);
      return;
    }
    setDeliveries(data ?? []);
  }

  async function toggleExpand(announcement) {
    if (expandedId === announcement.id) {
      setExpandedId("");
      return;
    }
    setExpandedId(announcement.id);
    await loadReport(announcement.id);
  }

  async function retry(announcementId) {
    setBusyId(announcementId);
    setReportError("");
    try {
      await sendPendingEmails(announcementId);
      await loadReport(announcementId);
    } catch (error) {
      setReportError(error.message);
    }
    setBusyId("");
  }

  function memberName(memberId) {
    return members.find((m) => m.id === memberId)?.full_name || "Unknown member";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#647b8f]">{announcements.length} announcement{announcements.length === 1 ? "" : "s"} across {clubs.length} club{clubs.length === 1 ? "" : "s"}</p>
        {!adding && (
          <button type="button" onClick={startAdd} disabled={clubs.length === 0} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:cursor-not-allowed disabled:opacity-50">
            + New announcement
          </button>
        )}
      </div>

      {clubs.length === 0 && <p className="mt-3 text-sm text-[#647b8f]">Create a club before posting announcements.</p>}

      {adding && (
        <form onSubmit={submitAdd} className="mt-4 grid gap-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5 sm:grid-cols-2">
          <label className="text-sm text-[#647b8f] sm:col-span-2">
            Title
            <input value={addForm.title} onChange={(event) => setAddForm({ ...addForm, title: event.target.value })} placeholder="December Contribution Deadline" className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm text-[#102a43] outline-none focus:border-[#1f5f8b]" />
          </label>
          <label className="text-sm text-[#647b8f] sm:col-span-2">
            Message
            <textarea value={addForm.body} onChange={(event) => setAddForm({ ...addForm, body: event.target.value })} rows={3} placeholder="All members must make their December contribution by 15 December 2026." className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm text-[#102a43] outline-none focus:border-[#1f5f8b]" />
          </label>
          <label className="text-sm text-[#647b8f]">
            Club
            <select value={addForm.stokvel_id} onChange={(event) => setAddForm({ ...addForm, stokvel_id: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[#647b8f]">
            Category
            <select value={addForm.category} onChange={(event) => setAddForm({ ...addForm, category: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
              {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-sm text-[#647b8f]">
            Audience
            <select value={addForm.audience} onChange={(event) => setAddForm({ ...addForm, audience: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
              {AUDIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <fieldset className="text-sm text-[#647b8f]">
            <legend>Delivery channels</legend>
            <div className="mt-1 flex gap-4">
              {CHANNEL_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-[#102a43]">
                  <input type="checkbox" checked={addForm.channels.includes(option.value)} onChange={() => setAddForm({ ...addForm, channels: toggleChannel(addForm.channels, option.value) })} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {addError && <p className="text-sm text-red-600 sm:col-span-2">{addError}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busyId === "adding"} className="rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{busyId === "adding" ? "Saving..." : "Save draft"}</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-[#173b56]/20 px-4 py-2 text-sm font-semibold text-[#647b8f] transition hover:bg-[#eef6fb]">Cancel</button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No announcements yet.</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
              <tr>
                <th className="px-5 py-4 font-semibold">Title</th>
                <th className="px-5 py-4 font-semibold">Club</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Audience</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d4f73]/10">
              {announcements.map((announcement) => {
                if (editingId === announcement.id) {
                  return (
                    <tr key={announcement.id} className="bg-[#eef6fb]">
                      <td colSpan={6} className="px-5 py-4">
                        <form onSubmit={(event) => submitEdit(event, announcement.id)} className="grid gap-3 sm:grid-cols-2">
                          <label className="text-xs text-[#647b8f] sm:col-span-2">
                            Title
                            <input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
                          </label>
                          <label className="text-xs text-[#647b8f] sm:col-span-2">
                            Message
                            <textarea value={editForm.body} onChange={(event) => setEditForm({ ...editForm, body: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]" />
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Club
                            <select value={editForm.stokvel_id} onChange={(event) => setEditForm({ ...editForm, stokvel_id: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
                              {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                            </select>
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Category
                            <select value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-[#1f5f8b]">
                              {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                          </label>
                          <label className="text-xs text-[#647b8f]">
                            Audience
                            <select value={editForm.audience} onChange={(event) => setEditForm({ ...editForm, audience: event.target.value })} className="mt-1 w-full rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]">
                              {AUDIENCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <fieldset className="text-xs text-[#647b8f]">
                            <legend>Delivery channels</legend>
                            <div className="mt-1 flex gap-4">
                              {CHANNEL_OPTIONS.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 text-[#102a43]">
                                  <input type="checkbox" checked={editForm.channels.includes(option.value)} onChange={() => setEditForm({ ...editForm, channels: toggleChannel(editForm.channels, option.value) })} />
                                  {option.label}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <div className="flex gap-2">
                            <button type="submit" disabled={busyId === announcement.id} className="rounded-lg bg-[#1f5f8b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{busyId === announcement.id ? "Saving..." : "Save"}</button>
                            <button type="button" onClick={cancelEdit} className="rounded-lg border border-[#173b56]/20 px-3 py-2 text-xs font-semibold text-[#647b8f] transition hover:bg-white">Cancel</button>
                          </div>
                          {editError && <p className="text-xs text-red-600 sm:col-span-2">{editError}</p>}
                        </form>
                      </td>
                    </tr>
                  );
                }

                const isExpanded = expandedId === announcement.id;
                const isPublished = announcement.status === "published";

                return (
                  <Fragment key={announcement.id}>
                    <tr className="hover:bg-[#eef6fb]">
                      <td className="px-5 py-4">{announcement.title}</td>
                      <td className="px-5 py-4 text-[#647b8f]">{clubName(announcement.stokvel_id)}</td>
                      <td className="px-5 py-4 capitalize text-[#647b8f]">{announcement.category}</td>
                      <td className="px-5 py-4 capitalize text-[#647b8f]">{announcement.audience}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${isPublished ? "bg-[#2775a6]/10 text-[#2775a6]" : "bg-[#647b8f]/10 text-[#647b8f]"}`}>{announcement.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {!isPublished && (
                          <>
                            <button type="button" onClick={() => startEdit(announcement)} className="mr-3 text-xs font-semibold text-[#2775a6] hover:underline">Edit</button>
                            <button type="button" onClick={() => publish(announcement)} disabled={busyId === announcement.id} className="text-xs font-semibold text-[#2775a6] hover:underline disabled:opacity-50">{busyId === announcement.id ? "Publishing..." : "Publish"}</button>
                          </>
                        )}
                        {isPublished && (
                          <button type="button" onClick={() => toggleExpand(announcement)} className="text-xs font-semibold text-[#2775a6] hover:underline">{isExpanded ? "Hide report" : "Delivery report"}</button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#f5f9fc]">
                        <td colSpan={6} className="px-5 py-4">
                          <DeliveryReport deliveries={deliveries} error={reportError} memberName={memberName} onRetry={() => retry(announcement.id)} retrying={busyId === announcement.id} />
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

function DeliveryReport({ deliveries, error, memberName, onRetry, retrying }) {
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!deliveries.length) return <p className="text-sm text-[#647b8f]">No deliveries recorded yet.</p>;

  const byChannel = deliveries.reduce((acc, delivery) => {
    acc[delivery.channel] = acc[delivery.channel] || [];
    acc[delivery.channel].push(delivery);
    return acc;
  }, {});
  const failedEmails = (byChannel.email || []).filter((d) => d.status === "failed");

  return (
    <div className="space-y-4">
      {Object.entries(byChannel).map(([channel, rows]) => {
        const sent = rows.filter((r) => r.status === "sent").length;
        const failed = rows.filter((r) => r.status === "failed").length;
        const pending = rows.filter((r) => r.status === "pending").length;
        return (
          <div key={channel}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#647b8f]">{channel === "in_app" ? "In-app" : "Email"} — {sent} sent, {failed} failed, {pending} pending</p>
            {channel === "email" && failed > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {rows.filter((r) => r.status === "failed").map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-red-600">
                    <span>{memberName(r.member_id)}</span>
                    <span className="text-xs">{r.error}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {failedEmails.length > 0 && (
        <button type="button" onClick={onRetry} disabled={retrying} className="rounded-lg bg-[#1f5f8b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">{retrying ? "Retrying..." : `Retry ${failedEmails.length} failed email${failedEmails.length === 1 ? "" : "s"}`}</button>
      )}
    </div>
  );
}
