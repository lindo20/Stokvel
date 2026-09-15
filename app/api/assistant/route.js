import { createClient } from "@supabase/supabase-js";

const DEFAULT_MODEL = "gemini-3.6-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `You are the Stokvel member assistant. Answer the member's question using ONLY the JSON records provided in <records> — never invent amounts, dates, names, or policies that aren't in there. If the records don't contain the answer, say so plainly and suggest who to ask (e.g. the treasurer or secretary). Use South African Rand formatting (R1,234.56). Be concise: a few sentences, not an essay. Never discuss other members or other clubs — you only ever have this one member's own records.`;

// Builds a Supabase client that acts as the calling member (their own JWT,
// not the service role), so every query below is still gated by RLS. If the
// token is wrong or expired, these queries simply return nothing/error —
// the assistant can never see more than the member is already allowed to.
function supabaseForUser(accessToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { question, clubId } = await request.json();
  if (!question?.trim() || !clubId) {
    return Response.json({ error: "Missing question or club." }, { status: 400 });
  }

  const supabase = supabaseForUser(accessToken);

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    return Response.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const [membershipResult, constitutionResult, announcementsResult] = await Promise.all([
    supabase.from("members").select("id, role, standing, joined_at").eq("stokvel_id", clubId).maybeSingle(),
    supabase.from("constitutions").select("club_type, contribution_amount, frequency, grace_period_days, quorum_percentage, effective_from").eq("stokvel_id", clubId).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("announcements").select("title, body, category, published_at").eq("stokvel_id", clubId).eq("status", "published").order("published_at", { ascending: false }).limit(5),
  ]);

  if (membershipResult.error) return Response.json({ error: membershipResult.error.message }, { status: 400 });
  const membership = membershipResult.data;
  if (!membership) return Response.json({ error: "You are not a member of this club." }, { status: 403 });

  const [contributionsResult, payoutsResult] = await Promise.all([
    supabase.from("contributions").select("amount, status, due_date, paid_at").eq("stokvel_id", clubId).eq("member_id", membership.id).order("due_date", { ascending: false }).limit(12),
    supabase.from("payouts").select("amount, status, scheduled_for").eq("stokvel_id", clubId).eq("member_id", membership.id).order("created_at", { ascending: false }).limit(12),
  ]);
  if (contributionsResult.error) return Response.json({ error: contributionsResult.error.message }, { status: 400 });
  if (payoutsResult.error) return Response.json({ error: payoutsResult.error.message }, { status: 400 });

  const records = {
    member: { role: membership.role, standing: membership.standing, memberSince: membership.joined_at },
    constitution: constitutionResult.data || null,
    contributions: contributionsResult.data || [],
    payouts: payoutsResult.data || [],
    announcements: (announcementsResult.data || []).map((a) => ({ title: a.title, body: a.body, category: a.category, publishedAt: a.published_at })),
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Assistant is not configured. Set GEMINI_API_KEY in .env.local." });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `<records>${JSON.stringify(records)}</records>\n\nQuestion: ${question.trim()}` }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return Response.json({ error: body.error?.message || `Assistant provider returned ${res.status}.` });
    }

    const data = await res.json();
    const answer = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text).filter(Boolean).join("\n").trim();
    return Response.json({ answer: answer || "I couldn't come up with an answer." });
  } catch (error) {
    return Response.json({ error: error.message || "Could not reach the assistant." });
  }
}
