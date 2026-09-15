"use client";

export default function PasswordResetForm({ onSubmit, message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6 text-[#102a43]">
      <section className="w-full max-w-md rounded-2xl border border-[#1d4f73]/10 bg-white/80 p-8 shadow-xl shadow-[#1d4f73]/10 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1f5f8b]">Stokvel</p>
        <h1 className="mt-4 text-3xl font-bold">Choose a new password</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm text-[#526b80]">New password<input name="password" type="password" minLength="8" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3" /></label>
          <label className="block text-sm text-[#526b80]">Confirm password<input name="confirmPassword" type="password" minLength="8" required className="mt-2 w-full rounded-lg border border-[#1d4f73]/15 bg-[#f8fbfd] px-4 py-3" /></label>
          {message && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{message}</p>}
          <button type="submit" className="w-full rounded-lg bg-[#2775a6] px-4 py-3 font-semibold text-white">Update password</button>
        </form>
      </section>
    </main>
  );
}
