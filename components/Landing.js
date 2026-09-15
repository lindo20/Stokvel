"use client";

import Feature from "./Feature";

export default function Landing({ onGetStarted }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f7fa] text-[#102a43]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d4f73] text-sm font-bold text-white">S</div>
          <div><p className="text-sm font-bold tracking-[0.18em]">STOKVEL</p><p className="text-xs text-[#647b8f]">Administration system</p></div>
        </div>
        <button onClick={onGetStarted} className="rounded-lg border border-[#1d4f73]/30 px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1d4f73] hover:text-white">Sign in</button>
      </nav>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-14 lg:px-10 lg:pb-28 lg:pt-20">
        <div>
          <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-[#1f5f8b]"><span className="h-px w-10 bg-[#1f5f8b]" />A clearer way to run a club</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-8xl">The records stay.<br /><span className="text-[#1f5f8b]">Trust grows.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#526b80]">A calm, accountable home for stokvel clubs. Keep the constitution visible, the ledger append-only, and every member close to the truth.</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button onClick={onGetStarted} className="rounded-lg bg-[#1f5f8b] px-7 py-3.5 font-semibold text-white shadow-lg shadow-[#1f5f8b]/20 transition hover:bg-[#174b70]">Enter your club</button>
            <span className="text-sm text-[#647b8f]">Built for transparency, not noise.</span>
          </div>
        </div>
      </section>

      <section className="border-y border-[#173b56]/10 bg-[#e8f0f6]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-3 lg:px-10"><Feature number="01" title="An append-only ledger" text="Contributions, penalties and payouts stay visible. Corrections are recorded, never erased." /><Feature number="02" title="The constitution, enforced" text="Club rules become clear settings: payout order, grace periods, quorum and waiting periods." /><Feature number="03" title="Two signatures" text="A payout needs the treasurer and a different officer. No single person moves the pool." /></div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-[#647b8f] sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>Stokvel Administration System</span><span>Every member can see for themselves.</span></footer>
    </main>
  );
}
