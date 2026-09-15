"use client";

import { useCallback, useEffect, useState } from "react";
import AuthForm from "../components/AuthForm";
import Dashboard from "../components/Dashboard";
import Landing from "../components/Landing";
import Notice from "../components/Notice";
import PasswordResetForm from "../components/PasswordResetForm";
import { getSupabaseBrowserClient } from "../lib/supabase";

// Shared by the initial load and any on-demand refresh (e.g. after an admin
// adds or edits a member) so both pull data the same way.
async function loadDashboardData(supabase, userId) {
  const [profileResult, stokvelResult, membersResult, constitutionResult, ledgerResult, contributionsResult, payoutsResult, announcementsResult, reconciliationsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, role").eq("id", userId).single(),
    supabase.from("stokvel").select("id, name, status, member_count, created_at").order("created_at", { ascending: false }),
    supabase.from("members").select("id, full_name, role, standing, joined_at, stokvel_id").order("joined_at", { ascending: false }),
    supabase.from("constitutions").select("id, version, club_type, contribution_amount, frequency, grace_period_days, quorum_percentage, effective_from, stokvel_id").order("version", { ascending: false }).limit(1),
    supabase.from("ledger_entries").select("id, entry_type, description, amount, resulting_balance, created_at, stokvel_id").order("created_at", { ascending: false }),
    supabase.from("contributions").select("id, amount, amount_paid, status, due_date, paid_at, member_id, stokvel_id").order("due_date", { ascending: false }),
    supabase.from("payouts").select("id, amount, status, scheduled_for, member_id, stokvel_id, initiated_by, approved_by, created_at").order("created_at", { ascending: false }),
    supabase.from("announcements").select("id, title, body, category, audience, channels, status, published_at, created_at, stokvel_id").order("created_at", { ascending: false }),
    supabase.from("reconciliations").select("id, ledger_balance, bank_balance, difference, notes, created_at, stokvel_id").order("created_at", { ascending: false }),
  ]);

  if (profileResult.error || stokvelResult.error) {
    return { error: profileResult.error?.message || stokvelResult.error?.message };
  }

  return {
    profile: profileResult.data,
    clubs: stokvelResult.data ?? [],
    dashboardData: {
      members: membersResult.data ?? [],
      constitution: constitutionResult.data?.[0] ?? null,
      ledger: ledgerResult.data ?? [],
      contributions: contributionsResult.data ?? [],
      payouts: payoutsResult.data ?? [],
      announcements: announcementsResult.data ?? [],
      reconciliations: reconciliationsResult.data ?? [],
    },
  };
}

export default function Home() {
  const [clientState] = useState(() => {
    try {
      return { client: getSupabaseBrowserClient(), error: "" };
    } catch (error) {
      return { client: null, error: error.message };
    }
  });
  const supabase = clientState.client;
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [dashboardData, setDashboardData] = useState({ members: [], constitution: null, ledger: [], contributions: [], payouts: [], announcements: [], reconciliations: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [joinableClubs, setJoinableClubs] = useState([]);
  const configError = clientState.error;

  // The sign-up form needs to offer a club to join before the visitor has a
  // session, so this runs independently of auth state.
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase
      .from("stokvel")
      .select("id, name")
      .eq("status", "active")
      .order("name")
      .then(({ data, error }) => {
        if (mounted && !error) setJoinableClubs(data ?? []);
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) {
        setSession(currentSession);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        if (event === "PASSWORD_RECOVERY") {
          setRecoveringPassword(true);
        }
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      return;
    }

    let mounted = true;

    loadDashboardData(supabase, session.user.id).then((result) => {
      if (!mounted) return;
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("");
        setProfile(result.profile);
        setClubs(result.clubs);
        setDashboardData(result.dashboardData);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [session, supabase]);

  // Re-fetches everything after a mutation (e.g. an admin adding or editing a
  // member) so the UI reflects what's actually in the database.
  const refreshDashboardData = useCallback(async () => {
    if (!supabase || !session) return;
    const result = await loadDashboardData(supabase, session.user.id);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("");
    setProfile(result.profile);
    setClubs(result.clubs);
    setDashboardData(result.dashboardData);
  }, [supabase, session]);

  async function signIn(event) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (error) setMessage(error.message);
  }

  async function forgotPassword(event) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.get("email"), {
      redirectTo: window.location.origin,
    });
    setMessage(error ? error.message : "Check your email for a password reset link.");
  }

  async function updatePassword(event) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)) {
      setMessage("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setRecoveringPassword(false);
    setMessage("Password updated. You are now signed in.");
  }

  async function signUp(event) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const role = String(formData.get("role") ?? "");
    const clubId = String(formData.get("clubId") ?? "").trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!/^[A-Za-z ]+$/.test(fullName)) {
      setMessage("Full name can contain letters and spaces only.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setMessage("Phone number must contain exactly 10 digits.");
      return;
    }
    // Admins create/own clubs rather than joining one, so they don't pick a
    // club at sign-up — every other role must, since a club has to exist
    // for them to belong to in the first place.
    if (role !== "admin" && !clubId) {
      setMessage("Choose which club you belong to.");
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)) {
      setMessage("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: formData.get("email"),
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role,
          club_id: clubId,
        },
      },
    });
    setMessage(error ? error.message : "Check your email to confirm your account.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (configError) {
    return <Notice title="Connect Supabase" message={configError} />;
  }
  if (loading) {
    return <Notice title="Loading" message="Checking your Supabase session..." />;
  }
  if (recoveringPassword) {
    return <PasswordResetForm onSubmit={updatePassword} message={message} />;
  }
  if (!session) {
    return authOpen ? (
      <AuthForm onSignIn={signIn} onSignUp={signUp} onForgotPassword={forgotPassword} onBack={() => setAuthOpen(false)} message={message} clubs={joinableClubs} />
    ) : (
      <Landing onGetStarted={() => setAuthOpen(true)} />
    );
  }

  return <Dashboard profile={profile || { full_name: session.user.email, email: session.user.email, role: session.user.user_metadata?.role || "member" }} session={session} clubs={clubs} dashboardData={dashboardData} message={message} onSignOut={signOut} onRefreshData={refreshDashboardData} />;
}
