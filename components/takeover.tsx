"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/countdown";
import { SiteNav } from "@/components/site-nav";
import { formatUsd } from "@/lib/money";
import type { PublicState } from "@/lib/types";

export function Takeover({ initial }: { initial: PublicState | null }) {
  const router = useRouter();
  const [state, setState] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as PublicState;
        if (!cancelled) setState(next);
      } catch {
        // Keep the last good frame on the screen.
      }
    }
    const timer = window.setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!state?.live?.endsAt) return;
    const wait = Math.max(
      0,
      new Date(state.live.endsAt).getTime() - Date.now() + 300,
    );
    const timer = window.setTimeout(() => {
      void fetch("/api/tick", { method: "POST" }).then(() => router.refresh());
    }, wait);
    return () => window.clearTimeout(timer);
  }, [state?.live?.endsAt, router]);

  const live = state?.live ?? null;
  const next = state?.next ?? null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(243,238,228,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(243,238,228,0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <SiteNav live={Boolean(live)} />

      <section className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-5 pb-36 pt-24 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-acid">
          {live ? "Currently holding the homepage" : "The clock is open"}
        </p>

        {live ? (
          <a
            href={`/go/${live.id}`}
            rel="nofollow sponsored noopener"
            className="group mt-4 block"
          >
            <div className="flex items-center gap-4">
              {live.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={live.logoUrl}
                  alt=""
                  className="size-14 rounded-lg bg-paper/10 object-contain p-1 md:size-20"
                />
              ) : null}
              <h1 className="font-display text-[18vw] leading-[0.8] tracking-wide text-paper sm:text-[12vw] md:text-[9rem]">
                {live.hostname}
              </h1>
            </div>
            <p className="mt-6 max-w-3xl text-xl text-paper/80 md:text-3xl">
              {live.tagline}
            </p>
          </a>
        ) : (
          <div className="mt-4">
            <h1 className="font-display text-[18vw] leading-[0.8] tracking-wide text-paper sm:text-[12vw] md:text-[9rem]">
              BUY THE MINUTE
            </h1>
            <p className="mt-6 max-w-2xl text-xl text-paper/80 md:text-3xl">
              $1 = 1 minute of this entire page. Nobody can take minutes you
              already paid for.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-end gap-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
              Time left
            </p>
            <Countdown
              endsAt={live?.endsAt ?? null}
              serverNow={state?.serverNow ?? new Date().toISOString()}
              className="font-display text-7xl leading-none text-acid md:text-[9rem]"
            />
          </div>
          <div className="font-mono text-sm text-mute">
            <p>{formatUsd(state?.stats.grossCents ?? 0)} on the clock</p>
            <p>
              {live
                ? `${live.clickCount} clicks · ${live.minutesPaid} min bought`
                : "Waiting for the first paid takeover"}
            </p>
            {next ? <p>Next up: {next.hostname}</p> : <p>Queue is empty</p>}
          </div>
        </div>
      </section>

      <footer className="absolute inset-x-0 bottom-0 z-20 border-t border-paper/15 bg-ink/80 p-4 backdrop-blur md:p-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
            $1 = 1 minute · min $5 · cutting the line pays the people you skip
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/buy?action=buy"
              className="bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink"
            >
              Buy minutes
            </a>
            <a
              href="/buy?action=cut"
              className="border border-paper/30 px-5 py-3 font-display text-2xl tracking-wide text-paper"
            >
              Cut the line
            </a>
            <a
              href="/buy?action=defend"
              className="border border-hot px-5 py-3 font-display text-2xl tracking-wide text-hot"
            >
              Defend
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
