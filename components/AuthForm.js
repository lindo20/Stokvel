"use client";

import { useState } from "react";

export default function AuthForm({ onSignIn, onSignUp, onForgotPassword, onBack, message, clubs = [] }) {
  const [mode, setMode] = useState("signIn");
  const [signUpRole, setSignUpRole] = useState("");
  const newAccount = mode === "signUp";
  const forgotPassword = mode === "forgotPassword";
  const needsClub = newAccount && signUpRole !== "admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6 py-10 text-[#102a43]">
      <button onClick={onBack} className="absolute left-6 top-6 text-sm text-[#647b8f] hover:text-[#18324a]">← Back to home</button>
      <section className="w-full max-w-md rounded-2xl border border-[#1d4f73]/10 bg-white/80 p-8 shadow-xl shadow-[#1d4f73]/10 backdrop-blur sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1f5f8b]">Stokvel</p>
        <h1 className="mt-4 text-3xl font-bold">{newAccount ? "Create an account" : forgotPassword ? "Reset your password" : "Welcome back"}</h1>
        <p className="mt-2 text-[#647b8f]">{forgotPassword ? "Enter your email and we will send you a reset link." : "Use your Supabase account to access your clubs."}</p>
        <form onSubmit={newAccount ? onSignUp : forgotPassword ? onForgotPassword : onSignIn} className="mt-8 space-y-4">
          {forgotPassword ? (
            <label className="block text-sm text-[#526b80]">
              Email
              <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
            </label>
          ) : (
            <>
              {newAccount && (
                <>
                  <label className="block text-sm text-[#526b80]">
                    Full name
                    <input name="fullName" type="text" autoComplete="name" pattern="[A-Za-z ]+" title="Letters and spaces only" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
                  </label>
                  <label className="block text-sm text-[#526b80]">
                    Phone number
                    <input name="phone" type="tel" autoComplete="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength="10" title="Enter exactly 10 digits" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
                  </label>
                  <label className="block text-sm text-[#526b80]">
                    Role
                    <select name="role" required value={signUpRole} onChange={(event) => setSignUpRole(event.target.value)} className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]">
                      <option value="" disabled>Select your role</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="chairman">Chairman</option>
                      <option value="secretary">Secretary</option>
                      <option value="treasurer">Treasurer</option>
                    </select>
                    {signUpRole === "admin" && <span className="mt-1 block text-xs text-[#647b8f]">Admins create and own clubs rather than joining one — you can create your club right after signing up.</span>}
                  </label>
                  {needsClub && (
                    <label className="block text-sm text-[#526b80]">
                      Club
                      <select name="clubId" required defaultValue="" disabled={clubs.length === 0} className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6] disabled:cursor-not-allowed disabled:opacity-60">
                        <option value="" disabled>{clubs.length === 0 ? "No clubs available yet" : "Select the club you belong to"}</option>
                        {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                      </select>
                      {clubs.length === 0 && <span className="mt-1 block text-xs text-[#647b8f]">Ask your club admin to create a club before you sign up.</span>}
                    </label>
                  )}
                </>
              )}
              <label className="block text-sm text-[#526b80]">
                Email
                <input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
              </label>
              <label className="block text-sm text-[#526b80]">
                Password
                <input name="password" type="password" autoComplete={newAccount ? "new-password" : "current-password"} minLength={newAccount ? "8" : undefined} pattern={newAccount ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}" : undefined} title={newAccount ? "At least 8 characters with uppercase, lowercase, number, and special character" : undefined} required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
              </label>
              {newAccount && (
                <label className="block text-sm text-[#526b80]">
                  Confirm password
                  <input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3 outline-none focus:border-[#2775a6]" />
                </label>
              )}
            </>
          )}
          {message && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{message}</p>}
          <button type="submit" className="w-full rounded-lg bg-[#2775a6] px-4 py-3 font-semibold text-white hover:bg-[#1d5d87]">
            {newAccount ? "Create account" : forgotPassword ? "Send reset link" : "Sign in"}
          </button>
        </form>
        {!newAccount && !forgotPassword && <button onClick={() => setMode("forgotPassword")} className="mt-5 block text-sm text-[#647b8f] hover:text-[#18324a]">Forgot password?</button>}
        <button onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")} className="mt-3 text-sm text-[#647b8f] hover:text-[#18324a]">
          {newAccount ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>
        {forgotPassword && <button onClick={() => setMode("signIn")} className="mt-3 block text-sm text-[#647b8f] hover:text-[#18324a]">Back to sign in</button>}
      </section>
    </main>
  );
}
