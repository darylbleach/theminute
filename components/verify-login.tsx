"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyLogin({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("Opening your stand-up…");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      try {
        const response = await fetch("/api/login/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !result.url) {
          throw new Error(result.error ?? "That link is not valid.");
        }
        router.push(result.url);
      } catch (error) {
        if (cancelled) return;
        setBusy(false);
        setMessage(
          error instanceof Error ? error.message : "That link is not valid.",
        );
      }
    }
    const timer = window.setTimeout(() => {
      void verify();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [token, router]);

  return (
    <div className="max-w-xl">
      <p className={busy ? "text-xl text-paper/80" : "text-xl text-hot"}>
        {message}
      </p>
      <noscript>
        <form action="/api/login/verify" method="post" className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink"
          >
            Open my rooms
          </button>
        </form>
      </noscript>
      {!busy ? (
        <a
          href="/login"
          className="mt-8 inline-block border border-paper/30 px-5 py-3 font-display text-2xl tracking-wide hover:border-acid hover:text-acid"
        >
          Request a new link
        </a>
      ) : null}
    </div>
  );
}
