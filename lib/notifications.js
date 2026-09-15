import { getSupabaseBrowserClient } from "./supabase";

const OFFICER_ROLES = ["admin", "chairman", "secretary", "treasurer"];

export function audienceMatches(audience, memberRole) {
  if (audience === "officers") return OFFICER_ROLES.includes(memberRole);
  if (audience === "members") return memberRole === "member";
  return true; // "all"
}

async function sendEmail(to, subject, text) {
  const res = await fetch("/api/notifications/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, text }),
  });
  return res.json();
}

// Publishing fans out to one delivery row per recipient per channel.
// in_app "delivery" is just the RLS-gated read access the member already
// has the moment the row is published, so those rows are recorded as sent
// immediately. email rows start pending and get attempted right after.
export async function publishAnnouncement(announcement, members) {
  const supabase = getSupabaseBrowserClient();
  const publishedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("announcements")
    .update({ status: "published", published_at: publishedAt })
    .eq("id", announcement.id);
  if (updateError) throw new Error(updateError.message);

  const recipients = members.filter(
    (member) => member.stokvel_id === announcement.stokvel_id && audienceMatches(announcement.audience, member.role)
  );

  const rows = recipients.flatMap((member) =>
    announcement.channels.map((channel) => ({
      stokvel_id: announcement.stokvel_id,
      announcement_id: announcement.id,
      member_id: member.id,
      channel,
      status: channel === "in_app" ? "sent" : "pending",
    }))
  );

  if (rows.length) {
    const { error: insertError } = await supabase.from("notification_deliveries").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  if (announcement.channels.includes("email")) {
    await sendPendingEmails(announcement.id);
  }
}

// Attempts (or retries) every pending/failed email delivery for an
// announcement. Looks up each recipient's address via their linked profile —
// members without a linked account (no user_id) are skipped, since there's
// nowhere to send.
export async function sendPendingEmails(announcementId) {
  const supabase = getSupabaseBrowserClient();

  const [{ data: announcement, error: announcementError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
    supabase.from("announcements").select("id, title, body").eq("id", announcementId).single(),
    supabase
      .from("notification_deliveries")
      .select("id, member_id, status, attempts")
      .eq("announcement_id", announcementId)
      .eq("channel", "email")
      .in("status", ["pending", "failed"]),
  ]);
  if (announcementError) throw new Error(announcementError.message);
  if (deliveriesError) throw new Error(deliveriesError.message);
  if (!deliveries.length) return;

  const memberIds = deliveries.map((delivery) => delivery.member_id);
  const { data: members, error: membersError } = await supabase.from("members").select("id, user_id").in("id", memberIds);
  if (membersError) throw new Error(membersError.message);

  const userIdByMemberId = Object.fromEntries(members.filter((m) => m.user_id).map((m) => [m.id, m.user_id]));
  const userIds = [...new Set(Object.values(userIdByMemberId))];

  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from("profiles").select("id, email").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(profilesError.message);
  const emailByUserId = Object.fromEntries(profiles.map((p) => [p.id, p.email]));

  await Promise.all(
    deliveries.map(async (delivery) => {
      const email = emailByUserId[userIdByMemberId[delivery.member_id]];
      const now = new Date().toISOString();

      if (!email) {
        return supabase
          .from("notification_deliveries")
          .update({ status: "failed", attempts: 1, last_attempt_at: now, error: "This member has no linked account to email." })
          .eq("id", delivery.id);
      }

      const result = await sendEmail(email, announcement.title, announcement.body);
      return supabase
        .from("notification_deliveries")
        .update({
          status: result.ok ? "sent" : "failed",
          attempts: (delivery.attempts || 0) + 1,
          last_attempt_at: now,
          error: result.ok ? null : result.error,
        })
        .eq("id", delivery.id);
    })
  );
}
