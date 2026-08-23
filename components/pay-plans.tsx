"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicRoom } from "@/lib/rooms";

type HostResponse = { room?: PublicRoom | null; error?: string };
type CheckoutResponse = { url?: string; error?: string; code?: string };

export function PayPlans() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"once" | "monthly" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/rooms", { cache: "no-store" });
        const result = (await response.json()) as HostResponse;
        setRoom(result.room ?? null);
      } catch {
        setError("Could not load your room.");
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(load);
  }, []);

  async function startCheckout(plan: "once" | "monthly") {
    setBusy(plan);
    setError("");
    try {
      const response = await fetch("/api/rooms/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = (await response.json()) as CheckoutResponse;
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not start checkout.");
      }
      window.location.href = result.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  if (!loaded) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
        Checking this browser’s room…
      </p>
    );
  }

  if (!room) {
    return (
      <div className="max-w-xl">
        <p className="text-xl text-paper/80">
          Create a stand-up first — it’s free. Unlock it from this browser.
          Stripe takes your email at checkout; that email owns the room, so you
          can open it from any computer.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink"
        >
          Create a stand-up
        </Link>
      </div>
    );
  }

  if (room.paid) {
    return (
      <div className="max-w-xl">
        <p className="text-xl text-paper/80">
          {room.name} is unlocked. Roster stays saved, and you can pick slot
          length from the host controls. On another computer, open it with the
          Stripe email — no password.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/r/${room.code}`}
            className="inline-block bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink"
          >
            Open room
          </Link>
          <Link
            href="/login"
            className="inline-block border border-paper/30 px-5 py-3 font-display text-2xl tracking-wide hover:border-acid hover:text-acid"
          >
            Open my rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="max-w-2xl text-xl text-paper/80">
        Unlock {room.name} for this team. Saved roster in Neon, slot lengths
        you pick. Stripe collects email at checkout — that email owns the room.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => startCheckout("once")}
          disabled={Boolean(busy)}
          className="border border-paper/25 p-6 text-left hover:border-acid disabled:opacity-50"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
            One-time
          </p>
          <p className="mt-3 font-display text-6xl tracking-wide">£19</p>
          <p className="mt-3 text-paper/70">
            Pay once. Keep this room, the roster, and slot lengths.
          </p>
          <p className="mt-6 font-display text-2xl tracking-wide">
            {busy === "once" ? "Opening Stripe…" : "Pay £19 once"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => startCheckout("monthly")}
          disabled={Boolean(busy)}
          className="border border-paper/25 p-6 text-left hover:border-acid disabled:opacity-50"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-acid">
            Monthly
          </p>
          <p className="mt-3 font-display text-6xl tracking-wide">£3/mo</p>
          <p className="mt-3 text-paper/70">
            Same unlock. Cancel any time and the room drops back to free
            limits.
          </p>
          <p className="mt-6 font-display text-2xl tracking-wide">
            {busy === "monthly" ? "Opening Stripe…" : "Pay £3/month"}
          </p>
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-6 text-sm text-hot">
          {error}
        </p>
      ) : null}
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        Host only · room {room.code} ·{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-acid">
          Open my rooms
        </Link>
      </p>
    </div>
  );
}
