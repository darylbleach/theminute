"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/page-shell";

export default function KillPage() {
  const [secret, setSecret] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"kill" | "pause" | "resume">("kill");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/kill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kill-secret": secret,
      },
      body: JSON.stringify({ action, reason }),
    });
    const payload = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Done." : payload.error ?? "Failed.");
  }

  return (
    <PageShell kicker="Operator" title="Kill switch.">
      <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
        <input
          type="password"
          required
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="KILL_SECRET"
          className="border border-paper/20 bg-ink px-4 py-3 outline-none focus:border-acid"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
          className="border border-paper/20 bg-ink px-4 py-3 outline-none focus:border-acid"
        />
        <select
          value={action}
          onChange={(event) =>
            setAction(event.target.value as "kill" | "pause" | "resume")
          }
          className="border border-paper/20 bg-ink px-4 py-3"
        >
          <option value="kill">Take down the live URL</option>
          <option value="pause">Pause the site</option>
          <option value="resume">Resume the site</option>
        </select>
        <button className="bg-hot px-5 py-3 font-display text-2xl text-paper">
          Execute
        </button>
        {message ? <p className="font-mono text-sm">{message}</p> : null}
      </form>
    </PageShell>
  );
}
