"use client";

const roleMenus = {
  member: {
    money: ["Payouts", "Ledger", "My statement"],
    club: ["Members", "Announcements", "Constitution"],
  },
  admin: {
    money: ["Payouts", "Ledger", "Statements"],
    club: ["Members", "Announcements", "Constitution", "Club settings"],
  },
  chairman: {
    money: ["Payouts", "Ledger", "Reports"],
    club: ["Members", "Announcements", "Constitution", "Decisions"],
  },
  secretary: {
    money: ["Payouts", "Ledger", "Statements"],
    club: ["Members", "Announcements", "Constitution", "Notices"],
  },
  treasurer: {
    money: ["Treasury", "My statement"],
    club: ["Members", "Announcements", "Constitution"],
  },
};

const icons = {
  Dashboard: "▦",
  Assistant: "◈",
  Treasury: "⇄",
  Payouts: "⇄",
  Ledger: "▣",
  "My statement": "▤",
  Statements: "▤",
  Members: "♧",
  Announcements: "✉",
  Constitution: "▤",
  "Club settings": "⚙",
  Reports: "▥",
  Decisions: "✓",
  Notices: "▤",
  Contributions: "＋",
};

export default function DashboardNav({ profile, activeItem, onNavigate, onSignOut }) {
  const role = profile.role || "member";
  const menu = roleMenus[role] || roleMenus.member;
  const displayName = profile.full_name || profile.email || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <aside className="flex min-h-full w-full shrink-0 flex-col bg-[#08172b] p-4 text-[#dcecf6] md:w-64 md:p-5">
      <div className="flex items-center justify-between gap-3 px-1 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#3159da] text-sm font-bold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-[#8fa5bb]">{roleLabel}</p>
          </div>
        </div>
        <span className="text-[#8fa5bb]" aria-hidden="true">⌄</span>
      </div>

      <nav className="mt-5" aria-label="Dashboard navigation">
        <NavItem label="Dashboard" active={activeItem === "Dashboard"} onClick={() => onNavigate("Dashboard")} />
        <NavItem label="Assistant" active={activeItem === "Assistant"} onClick={() => onNavigate("Assistant")} />
        <p className="mb-2 mt-6 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#627992]">Money</p>
        {menu.money.map((item) => <NavItem key={item} label={item} onClick={() => onNavigate(item)} />)}
        <p className="mb-2 mt-6 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#627992]">Club</p>
        {menu.club.map((item) => <NavItem key={item} label={item} onClick={() => onNavigate(item)} />)}
      </nav>

      <button onClick={onSignOut} className="mt-auto rounded-md px-3 py-3 text-left text-sm text-[#8fa5bb] transition hover:bg-white/10 hover:text-white">Sign out</button>
    </aside>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button onClick={onClick} type="button" className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${active ? "bg-[#263448] font-semibold text-white" : "text-[#c6d4e1] hover:bg-white/10 hover:text-white"}`}>
      <span className="flex h-5 w-5 items-center justify-center text-base text-[#c6d4e1]" aria-hidden="true">{icons[label] || "•"}</span>
      <span>{label}</span>
    </button>
  );
}
