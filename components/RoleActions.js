export default function RoleActions({ role }) {
  const actions = {
    member: ["View my balance", "Check payout position", "Read club notices"],
    admin: ["Manage users", "Review club status", "View activity"],
    chairman: ["Review decisions", "Monitor club health", "Approve governance updates"],
    secretary: ["Manage notices", "Maintain records", "Review meeting actions"],
    treasurer: ["Record contributions", "Review payouts", "Check ledger"],
  }[role] || ["View dashboard", "Review club updates", "View profile"];

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      {actions.map((action) => (
        <button key={action} type="button" className="rounded-xl border border-[#1d4f73]/10 bg-white/80 px-4 py-4 text-left text-sm font-semibold shadow-sm transition hover:border-[#2775a6] hover:bg-white">
          {action}<span className="mt-2 block text-xs font-normal text-[#647b8f]">Available in your role</span>
        </button>
      ))}
    </div>
  );
}
