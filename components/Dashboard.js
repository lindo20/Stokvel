"use client";

import { useState } from "react";
import DashboardNav from "./DashboardNav";
import DashboardViews from "./DashboardViews";
import RoleActions from "./RoleActions";

export default function Dashboard({ profile, session, clubs, dashboardData, message, onSignOut, onRefreshData }) {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [selectedClubId, setSelectedClubId] = useState("");
  const currentClubId = selectedClubId || clubs[0]?.id || "";
  const selectedClub = clubs.find((club) => club.id === currentClubId);
  const selectedData = {
    members: dashboardData.members.filter((item) => item.stokvel_id === currentClubId),
    constitution: dashboardData.constitution?.stokvel_id === currentClubId ? dashboardData.constitution : null,
    ledger: dashboardData.ledger.filter((item) => item.stokvel_id === currentClubId),
    contributions: dashboardData.contributions.filter((item) => item.stokvel_id === currentClubId),
    payouts: dashboardData.payouts.filter((item) => item.stokvel_id === currentClubId),
    announcements: dashboardData.announcements.filter((item) => item.stokvel_id === currentClubId),
    reconciliations: dashboardData.reconciliations.filter((item) => item.stokvel_id === currentClubId),
  };
  const role = profile.role || "member";
  const roleContent = {
    member: { title: "Member dashboard", subtitle: "Your contributions, position and club updates." },
    admin: { title: "Admin dashboard", subtitle: "Manage club access, members and platform activity." },
    chairman: { title: "Chairman dashboard", subtitle: "Oversee governance, decisions and club performance." },
    secretary: { title: "Secretary dashboard", subtitle: "Keep records, notices and club administration in order." },
    treasurer: { title: "Treasurer dashboard", subtitle: "Track contributions, payouts and financial records." },
  }[role] || { title: "Member dashboard", subtitle: "Your contributions, position and club updates." };

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#102a43] md:flex">
      <DashboardNav profile={profile} activeItem={activeItem} onNavigate={setActiveItem} onSignOut={onSignOut} />
      <div className="min-w-0 flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1d4f73]/15 pb-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1f5f8b]">Stokvel</p>
            <h1 className="mt-2 text-3xl font-bold">{activeItem === "Dashboard" ? roleContent.title : activeItem}</h1>
          </div>
            <div className="flex items-center gap-3">
              {clubs.length > 0 && <select value={currentClubId} onChange={(event) => setSelectedClubId(event.target.value)} aria-label="Choose a club" className="rounded-lg border border-[#173b56]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#1f5f8b]"><option value="" disabled>Choose a club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select>}
              <span className="rounded-full bg-[#1f5f8b]/10 px-3 py-1 text-sm text-[#1f5f8b]">{role}</span>
            </div>
          </header>

          <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[#60758a]">Signed in as {session.user.email}</p>
              <p className="text-[#647b8f]">{profile.full_name} · {profile.email}</p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#1f5f8b]">{role}</p>
              <h2 className="mt-2 text-2xl font-semibold">{roleContent.subtitle}</h2>
            </div>
            <span className="rounded-full bg-[#2775a6]/10 px-3 py-1 text-sm text-[#2775a6]">Live data</span>
          </div>

          {message && <p className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-red-200">{message}</p>}
          {!message && activeItem === "Dashboard" && <RoleActions role={role} />}
          {!message && activeItem === "Dashboard" && clubs.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-[#1d4f73]/25 p-10 text-center text-[#647b8f]">
              <p>No clubs found for this account.</p>
              {role === "admin" && (
                <button type="button" onClick={() => setActiveItem("Club settings")} className="mt-4 rounded-lg bg-[#1f5f8b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18496b]">
                  + Create your first club
                </button>
              )}
            </div>
          )}

          {!message && activeItem === "Dashboard" && selectedClub && <div className="mt-8 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-6 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-[#647b8f]">Selected club</p><h3 className="mt-2 text-xl font-semibold">{selectedClub.name}</h3></div><span className="text-xs uppercase tracking-wider text-[#2775a6]">{selectedClub.status}</span></div><p className="mt-8 text-sm text-[#647b8f]">Members</p><p className="mt-1 text-3xl font-semibold">{selectedClub.member_count}</p></div>}
          {!message && activeItem !== "Dashboard" && <DashboardViews activeItem={activeItem} data={selectedData} role={role} clubs={clubs} clubId={currentClubId} userId={session.user.id} allMembers={dashboardData.members} allContributions={dashboardData.contributions} allPayouts={dashboardData.payouts} allAnnouncements={dashboardData.announcements} onRefreshData={onRefreshData} />}
          </section>
        </div>
      </div>
    </main>
  );
}
