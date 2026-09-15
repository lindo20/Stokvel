const CATEGORY_LABELS = { general: "General", meeting: "Meeting", contribution: "Contribution", payout: "Payout" };

function formatDate(value) {
  return new Date(value).toLocaleString("en-ZA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AnnouncementsView({ announcements }) {
  if (!announcements.length) {
    return <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">No announcements yet.</div>;
  }

  const sorted = [...announcements].sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));

  return (
    <div className="space-y-4">
      {sorted.map((announcement) => (
        <div key={announcement.id} className="rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{announcement.title}</h3>
            <span className="rounded-full bg-[#2775a6]/10 px-2.5 py-1 text-xs font-semibold text-[#2775a6]">{CATEGORY_LABELS[announcement.category] || announcement.category}</span>
          </div>
          <p className="mt-1 text-xs text-[#647b8f]">{formatDate(announcement.published_at || announcement.created_at)}</p>
          <p className="mt-3 text-sm text-[#334f66]">{announcement.body}</p>
        </div>
      ))}
    </div>
  );
}
