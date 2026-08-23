"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LOGIN_SENT_MESSAGE } from "@/lib/login-copy";

export function LoginForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(initialError);
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);

  async function sendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("send");
    setMessage("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not send a login email.");
      }
      setSent(true);
      setMessage(result.message ?? LOGIN_SENT_MESSAGE);
    } catch (caught) {
      setSent(false);
      setMessage(
        caught instanceof Error ? caught.message : "Could not send a login email.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("verify");
    setMessage("");
    try {
      const response = await fetch("/api/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error ?? "Could not open your rooms.");
      }
      router.push(result.url);
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not open your rooms.",
      );
      setBusy(null);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-xl text-paper/80">
        After Stripe checkout, that email owns the room. Enter it here — no
        password. Joiners still use the share link, and free rooms stay on this
        browser.
      </p>

      <form onSubmit={sendLink} className="mt-10">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          Stripe email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-2 block w-full border border-paper/25 bg-ink px-4 py-3 text-lg normal-case tracking-normal text-paper outline-none focus:border-acid"
            placeholder="you@company.com"
          />
        </label>
        <button
          type="submit"
          disabled={Boolean(busy)}
          className="mt-4 bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink disabled:opacity-50"
        >
          {busy === "send" ? "Sending…" : "Email me a link"}
        </button>
      </form>

      {sent ? (
        <form onSubmit={verifyCode} className="mt-10 border-t border-paper/15 pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-acid">
            Six-digit code
          </p>
          <p className="mt-3 text-paper/70">{LOGIN_SENT_MESSAGE}</p>
          <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            Code from the email
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              className="mt-2 block w-40 border border-paper/25 bg-ink px-4 py-3 font-mono text-2xl tracking-[0.3em] text-paper outline-none focus:border-acid"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(busy) || code.length !== 6}
            className="mt-4 border border-paper/30 px-5 py-3 font-display text-2xl tracking-wide hover:border-acid hover:text-acid disabled:opacity-50"
          >
            {busy === "verify" ? "Opening…" : "Open my rooms"}
          </button>
        </form>
      ) : null}

      {message && message !== LOGIN_SENT_MESSAGE ? (
        <p role="alert" className="mt-6 text-sm text-hot">
          {message}
        </p>
      ) : null}

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        Unlock first · £19 once or £3/month ·{" "}
        <Link href="/pay" className="underline underline-offset-4 hover:text-acid">
          See plans
        </Link>
      </p>
    </div>
  );
}
