"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function AssistantView({ clubId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function ask(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !clubId || asking) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setAsking(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ question: trimmed, clubId }),
      });
      const body = await res.json().catch(() => ({}));
      setMessages((prev) => [...prev, { role: "assistant", text: body.answer || body.error || "Something went wrong.", isError: !body.answer }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: error.message, isError: true }]);
    }

    setAsking(false);
  }

  if (!clubId) {
    return <div className="rounded-xl border border-dashed border-[#1d4f73]/25 bg-white/50 p-10 text-center text-[#647b8f]">Choose a club to ask the assistant.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[220px] space-y-3 rounded-xl border border-[#1d4f73]/10 bg-white/80 p-5">
        {messages.length === 0 && (
          <p className="text-sm text-[#647b8f]">Ask about your standing, contributions, next payout, or recent announcements for this club — answered from your own real records.</p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[80%] rounded-lg bg-[#1f5f8b] p-3 text-sm text-white"
                : `max-w-[80%] rounded-lg p-3 text-sm ${message.isError ? "bg-red-400/10 text-red-700" : "bg-[#eef6fb] text-[#102a43]"}`
            }
          >
            {message.text}
          </div>
        ))}
        {asking && <div className="max-w-[80%] rounded-lg bg-[#eef6fb] p-3 text-sm text-[#647b8f]">Checking your records...</div>}
      </div>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. How much do I still owe this month?"
          className="flex-1 rounded-lg border border-[#173b56]/20 bg-white px-4 py-3 text-sm outline-none focus:border-[#1f5f8b]"
        />
        <button type="submit" disabled={asking || !question.trim()} className="rounded-lg bg-[#1f5f8b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18496b] disabled:opacity-50">
          Ask
        </button>
      </form>
    </div>
  );
}
