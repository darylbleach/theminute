"use client";

import { useMemo, useState, type FormEvent } from "react";
import { track } from "@vercel/analytics";
import { MIN_MINUTES } from "@/lib/config";
import { formatUsd, minutesCostCents } from "@/lib/money";
import type { PublicState } from "@/lib/types";

type Action = "buy" | "cut" | "defend";

export function BuyForm({
  state,
  defaultAction,
}: {
  state: PublicState | null;
  defaultAction: Action;
}) {
  const [action, setAction] = useState<Action>(defaultAction);
  const [url, setUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);
  const [email, setEmail] = useState("");
  const [minutes, setMinutes] = useState(MIN_MINUTES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoPreview = useMemo(() => {
    const trimmed = logoUrl.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(
        trimmed.includes("://") ? trimmed : `https://${trimmed}`,
      );
      return parsed.protocol === "https:" ? parsed.toString() : null;
    } catch {
      return null;
    }
  }, [logoUrl]);

  const cut = state?.cutQuote;
  const estimate = useMemo(() => {
    const base = minutesCostCents(minutes);
    const premium = action === "cut" ? (cut?.premiumCents ?? 0) : 0;
    return base + premium;
  }, [action, minutes, cut?.premiumCents]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tagline, logoUrl, email, minutes, action }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout failed.");
      }
      track("checkout_started", { action });
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-3 gap-2">
        {(
          [
            ["buy", "Queue"],
            ["cut", "Cut"],
            ["defend", "Defend"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setAction(value)}
            className={`border px-3 py-3 font-mono text-xs uppercase tracking-[0.16em] ${
              action === value
                ? "border-acid bg-acid text-ink"
                : "border-paper/20 text-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </fieldset>

      {action !== "defend" ? (
        <>
          <label className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
            URL
            <input
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://yoursite.com"
              className="border border-paper/20 bg-ink px-4 py-3 text-base normal-case tracking-normal text-paper outline-none focus:border-acid"
            />
          </label>
          <label className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
            One line
            <input
              required
              maxLength={140}
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="What this page is selling"
              className="border border-paper/20 bg-ink px-4 py-3 text-base normal-case tracking-normal text-paper outline-none focus:border-acid"
            />
          </label>
          <label className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
            Logo (optional)
            <input
              value={logoUrl}
              onChange={(event) => {
                setLogoUrl(event.target.value);
                setLogoBroken(false);
              }}
              placeholder="https://yoursite.com/logo.png"
              className="border border-paper/20 bg-ink px-4 py-3 text-base normal-case tracking-normal text-paper outline-none focus:border-acid"
            />
            <span className="normal-case tracking-normal text-mute">
              Link a PNG or SVG. Leave it blank and we use your site&apos;s
              favicon.
            </span>
          </label>

          {logoPreview ? (
            <div className="flex items-center gap-4 border border-paper/15 p-4">
              {logoBroken ? (
                <p className="font-mono text-xs text-hot">
                  That image would not load. Check the link or leave it blank.
                </p>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Your logo as it will appear on the homepage"
                    onError={() => setLogoBroken(true)}
                    className="size-14 rounded-lg bg-paper/10 object-contain p-1"
                  />
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
                    Preview
                  </p>
                </>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <p className="border border-hot/40 bg-hot/10 p-4 text-sm text-paper/80">
          Use the same email you paid with. Extra minutes stack onto the live
          reign while people are watching the clock.
        </p>
      )}

      <label className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@domain.com"
          className="border border-paper/20 bg-ink px-4 py-3 text-base normal-case tracking-normal text-paper outline-none focus:border-acid"
        />
      </label>

      <label className="flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
        Minutes ({formatUsd(100)} each, min {MIN_MINUTES})
        <input
          required
          type="number"
          min={MIN_MINUTES}
          max={24 * 60}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          className="border border-paper/20 bg-ink px-4 py-3 text-base normal-case tracking-normal text-paper outline-none focus:border-acid"
        />
      </label>

      {action === "cut" ? (
        <p className="text-sm text-paper/75">
          Jumping {state?.queue.length ?? 0} holder
          {(state?.queue.length ?? 0) === 1 ? "" : "s"} costs{" "}
          <span className="text-acid">{formatUsd(cut?.premiumCents ?? 0)}</span>{" "}
          on top. 80% of that becomes site credit for the people you skip.
        </p>
      ) : null}

      <p className="font-display text-5xl text-acid">{formatUsd(estimate)}</p>
      <p className="text-xs text-mute">
        Paid advertising placement, not a contest. No refunds. Credits are site
        credit, not cash.{" "}
        <a href="/terms" className="underline">
          Terms
        </a>
        .
      </p>

      {error ? <p className="text-sm text-hot">{error}</p> : null}

      <button
        disabled={busy}
        className="bg-acid px-6 py-4 font-display text-3xl tracking-wide text-ink disabled:opacity-60"
      >
        {busy ? "Sending you to Stripe…" : "Pay and take the page"}
      </button>
    </form>
  );
}
