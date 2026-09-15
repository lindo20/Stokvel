import AdminAnnouncementsPanel from "./AdminAnnouncementsPanel";
import AdminMembersPanel from "./AdminMembersPanel";
import AnnouncementsView from "./AnnouncementsView";
import AssistantView from "./AssistantView";
import ClubSettingsPanel from "./ClubSettingsPanel";
import TreasurerPanel from "./TreasurerPanel";

const OFFICER_ROLES = ["admin", "chairman", "secretary", "treasurer"];

function EmptyView({ title, text }) {
  return <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]"><h3 className="font-semibold text-[#18324a]">{title}</h3><p className="mt-2 text-sm">{text}</p></div>;
}

function DataTable({ headers, rows }) {
  if (!rows.length) return null;
  return <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]"><tr>{headers.map((header) => <th key={header} className="px-5 py-4 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#1d4f73]/10">{rows.map((row) => <tr key={row.id} className="hover:bg-[#eef6fb]"><td className="px-5 py-4">{row.primary}</td><td className="px-5 py-4 text-[#647b8f]">{row.secondary}</td><td className="px-5 py-4"><span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold text-[#2775a6]">{row.status}</span></td></tr>)}</tbody></table></div>;
}

function MembersTable({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1d4f73]/10 bg-white/80">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="border-b border-[#1d4f73]/10 text-xs uppercase tracking-wider text-[#647b8f]">
          <tr>{["Member", "Role", "Standing"].map((header) => <th key={header} className="px-5 py-4 font-semibold">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#1d4f73]/10">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#eef6fb]">
              <td className="px-5 py-4">{row.name}</td>
              <td className="px-5 py-4 text-[#647b8f] capitalize">{row.role}</td>
              <td className="px-5 py-4"><span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold text-[#2775a6] capitalize">{row.standing.replace("_", " ")}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardViews({ activeItem, data, role, clubs = [], clubId = "", userId = "", allMembers = [], allContributions = [], allPayouts = [], allAnnouncements = [], onRefreshData }) {
  if (activeItem === "Assistant") {
    return <AssistantView clubId={clubId} />;
  }

  if (activeItem === "Treasury") {
    if (!clubId) {
      return <EmptyView title="Choose a club" text="Pick a club above to manage its contributions, ledger and payouts." />;
    }
    return (
      <TreasurerPanel
        clubId={clubId}
        userId={userId}
        members={data.members}
        contributions={data.contributions}
        payouts={data.payouts}
        ledger={data.ledger}
        reconciliations={data.reconciliations}
        onRefresh={onRefreshData}
      />
    );
  }

  if (activeItem === "Club settings") {
    return <ClubSettingsPanel clubs={clubs} ownerId={userId} onRefresh={onRefreshData} />;
  }

  if (activeItem === "Members") {
    if (role === "admin") {
      return <AdminMembersPanel clubs={clubs} members={allMembers} contributions={allContributions} payouts={allPayouts} onRefresh={onRefreshData} />;
    }
    const members = data.members;
    if (!members.length) {
      return <EmptyView title="No members yet" text="Members will appear here once they are added to this stokvel." />;
    }
    const rows = members.map((member) => ({
      id: member.id,
      name: member.full_name,
      role: member.role,
      standing: member.standing,
    }));
    return <MembersTable rows={rows} />;
  }

  if (activeItem === "Announcements") {
    if (OFFICER_ROLES.includes(role)) {
      return <AdminAnnouncementsPanel clubs={clubs} announcements={allAnnouncements} members={allMembers} onRefresh={onRefreshData} />;
    }
    return <AnnouncementsView announcements={data.announcements} />;
  }

  if (activeItem === "Constitution") {
    const constitution = data.constitution;
    return constitution ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Club type", constitution.club_type], ["Contribution", `R ${Number(constitution.contribution_amount).toFixed(2)}`], ["Frequency", constitution.frequency], ["Quorum", `${constitution.quorum_percentage}%`]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5"><p className="text-xs uppercase tracking-wider text-[#647b8f]">{label}</p><p className="mt-3 text-xl font-semibold capitalize">{value}</p></div>)}</div> : <EmptyView title="No constitution recorded" text="Run the Supabase schema and add the current club constitution to see it here." />;
  }

  if (["Payouts", "Ledger", "My statement", "Statements", "Reports", "Contributions"].includes(activeItem)) {
    const entries = activeItem === "Payouts" ? data.payouts.map((item) => ({ id: item.id, primary: `R ${Number(item.amount).toFixed(2)}`, secondary: item.scheduled_for || "No date", status: item.status })) : activeItem === "Ledger" ? data.ledger.map((item) => ({ id: item.id, primary: item.description, secondary: `R ${Number(item.amount).toFixed(2)}`, status: item.entry_type })) : data.contributions.map((item) => ({ id: item.id, primary: `R ${Number(item.amount).toFixed(2)}`, secondary: item.due_date, status: item.status }));
    return entries.length ? <DataTable headers={[activeItem, "Details", "Status"]} rows={entries} /> : <EmptyView title={`No ${activeItem.toLowerCase()} yet`} text="Live records will appear here when this area has data." />;
  }

  return <EmptyView title={`${activeItem} workspace`} text="This role-specific workspace is ready for its Supabase records." />;
}
