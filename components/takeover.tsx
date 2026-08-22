"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/countdown";
import { SiteNav } from "@/components/site-nav";
import { formatUsd } from "@/lib/money";
import type { PublicState } from "@/lib/types";
import { faviconFor } from "@/lib/urls";

/**
 * The headline is the whole product, so it must never run off the side of a
 * phone. Bebas Neue is condensed at roughly 0.47em per glyph, so size the type
 * to the longest unbreakable word rather than to the viewport alone. The 7.5vw
 * floor stops a very long domain shrinking into illegibility: past that point
 * it wraps instead.
 */
function Headline({ text, reservedPx }: { text: string; reservedPx: number }) {
  const longestWord = text
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 1);
  const widthBudget = `calc((100vw - ${reservedPx}px) / ${(longestWord * 0.47).toFixed(2)})`;

  return (
    <h1
      className="font-display leading-[0.82] tracking-wide text-paper [overflow-wrap:anywhere]"
      style={{ fontSize: `max(min(18vw, ${widthBudget}, 9rem), 7.5vw)` }}
    >
      {text}
    </h1>
  );
}

function ReignLogo({
  src,
  hostname,
  className = "size-11 shrink-0 rounded-lg bg-paper/10 object-contain p-1 sm:size-14 md:size-20",
}: {
  src: string;
  hostname: string;
  className?: string;
}) {
  const fallback = faviconFor(hostname);
  const [current, setCurrent] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      onError={() => setCurrent((value) => (value === fallback ? value : fallback))}
      className={className}
    />
  );
}

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
  const lastPaid = state?.lastPaid ?? null;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-paper">
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

      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-10 pt-24 md:px-10 md:pt-28">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-acid sm:text-[11px]">
          {live ? "Currently holding the homepage" : "The clock is open"}
        </p>

        {live ? (
          <a
            href={`/go/${live.id}`}
            rel="nofollow sponsored noopener"
            className="group mt-3 block md:mt-4"
          >
            <div className="flex items-center gap-3 md:gap-4">
              {live.logoUrl ? (
                <ReignLogo
                  key={live.logoUrl}
                  src={live.logoUrl}
                  hostname={live.hostname}
                />
              ) : null}
              <Headline text={live.hostname} reservedPx={live.logoUrl ? 108 : 48} />
            </div>
            <p className="mt-5 max-w-3xl text-lg text-paper/80 sm:text-xl md:text-3xl">
              {live.tagline}
            </p>
          </a>
        ) : (
          <div className="mt-3 md:mt-4">
            <Headline text="BUY THE MINUTE" reservedPx={48} />
            <p className="mt-5 max-w-2xl text-lg text-paper/80 sm:text-xl md:text-3xl">
              $1 = 1 minute of this entire page. Nobody can take minutes you
              already paid for.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8 md:mt-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute sm:text-[11px]">
              Time left
            </p>
            <Countdown
              endsAt={live?.endsAt ?? null}
              serverNow={state?.serverNow ?? new Date().toISOString()}
              className="font-display text-6xl leading-none text-acid sm:text-7xl md:text-[9rem]"
            />
          </div>
          <div className="font-mono text-xs text-mute sm:text-sm">
            <p>{formatUsd(state?.stats.grossCents ?? 0)} on the clock</p>
            <p>
              {live
                ? `${live.clickCount} clicks · ${live.minutesPaid} min bought`
                : lastPaid
                  ? "Nobody on the clock right now"
                  : "Waiting for the first paid takeover"}
            </p>
            {next ? <p>Next up: {next.hostname}</p> : <p>Queue is empty</p>}
          </div>
        </div>

        {!live && lastPaid ? (
          <div className="mt-10 border-t border-paper/15 pt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
              Last on the homepage
            </p>
            <a
              href={`/go/${lastPaid.id}`}
              rel="nofollow sponsored noopener"
              className="mt-3 inline-flex max-w-full items-center gap-3 text-paper/80 hover:text-acid"
            >
              {lastPaid.logoUrl ? (
                <ReignLogo
                  key={lastPaid.logoUrl}
                  src={lastPaid.logoUrl}
                  hostname={lastPaid.hostname}
                  className="size-9 shrink-0 rounded-md bg-paper/10 object-contain p-1"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block truncate font-display text-2xl tracking-wide md:text-3xl">
                  {lastPaid.hostname}
                </span>
                <span className="block truncate text-sm text-mute">
                  {lastPaid.tagline}
                </span>
              </span>
            </a>
          </div>
        ) : null}
      </section>

      <footer className="relative z-20 border-t border-paper/15 bg-ink/80 p-4 backdrop-blur md:p-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
          <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-mute md:text-[11px]">
            $1 = 1 minute · min $5 · cutting the line pays the people you skip
          </p>
          <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
            <a
              href="/buy?action=buy"
              className="col-span-2 bg-acid px-5 py-3 text-center font-display text-2xl tracking-wide text-ink md:col-span-1"
            >
              Buy minutes
            </a>
            <a
              href="/buy?action=cut"
              className="border border-paper/30 px-5 py-3 text-center font-display text-xl tracking-wide text-paper md:text-2xl"
            >
              Cut the line
            </a>
            <a
              href="/buy?action=defend"
              className="border border-hot px-5 py-3 text-center font-display text-xl tracking-wide text-hot md:text-2xl"
            >
              Defend
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
