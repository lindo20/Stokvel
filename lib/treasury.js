import { getSupabaseBrowserClient } from "./supabase";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export async function recordContributionPayment(contributionId, amount, description) {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.rpc("record_contribution_payment", {
      p_contribution_id: contributionId,
      p_amount: amount,
      p_description: description || null,
    })
  );
}

export async function initiatePayout(clubId, memberId, amount, scheduledFor) {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.rpc("initiate_payout", {
      p_stokvel_id: clubId,
      p_member_id: memberId,
      p_amount: amount,
      p_scheduled_for: scheduledFor || null,
    })
  );
}

export async function approvePayout(payoutId) {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("approve_payout", { p_payout_id: payoutId }));
}
