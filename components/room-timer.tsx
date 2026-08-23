"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatSlotRemaining } from "@/lib/format";
import { SLOT_PRESETS, slotLabel, type PublicRoom } from "@/lib/rooms";

type RoomResponse = PublicRoom & { error?: string };

export function RoomTimer({
  code,
  checkoutSuccess = false,
}: {
  code: string;
  checkoutSuccess?: boolean;
}) {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [remaining, setRemaining] = useState(60);
  const [joinName, setJoinName] = useState("");
  const [customMinutes, setCustomMinutes] = useState("3");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      const result = (await response.json()) as RoomResponse;
      if (!response.ok) {
        setMessage(result.error ?? "Room not found.");
        return;
      }
      setRoom(result);
    } catch {
      setMessage("Trying to reconnect…");
    }
  }, [code]);

  useEffect(() => {
    const initial = window.setTimeout(refresh, 0);
    const poll = window.setInterval(refresh, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    if (!room) return;
    const offset = Date.now() - new Date(room.serverNow).getTime();
    function tick() {
      setRemaining(
        Math.max(
          0,
          Math.ceil(
            (new Date(room!.endsAt).getTime() - (Date.now() - offset)) / 1000,
          ),
        ),
      );
    }
    tick();
    const clock = window.setInterval(tick, 100);
    return () => window.clearInterval(clock);
  }, [room]);

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joinName }),
      });
      const result = (await response.json()) as RoomResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not join.");
      setRoom(result);
      setJoinName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }

  async function control(
    action: "skip" | "restart" | "slot",
    slotSeconds?: number,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slotSeconds }),
      });
      const result = (await response.json()) as RoomResponse;
      if (!response.ok) throw new Error(result.error ?? "Control failed.");
      setRoom(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Control failed.");
    } finally {
      setBusy(false);
    }
  }

  function setCustomSlot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minutes = Number(customMinutes);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setMessage("Custom slots are a whole number of minutes.");
      return;
    }
    void control("slot", minutes * 60);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const currentName = room?.roster[room.currentIndex] ?? "Loading";
  const slotSeconds = room?.slotSeconds ?? 60;
  const maxPeople = room?.maxPeople ?? 6;
  const displayRemaining = formatSlotRemaining(remaining, slotSeconds);
  const unlocking = checkoutSuccess && !room?.paid;

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

      <header className="relative z-10 flex items-center justify-between gap-4 p-4 md:p-6">
        <Link
          href="/"
          className="font-display text-2xl tracking-wide text-acid md:text-4xl"
        >
          The Minute
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-mute sm:inline">
            {room?.name ?? `Room ${code}`}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="border border-paper/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] hover:border-acid hover:text-acid"
          >
            {copied ? "Copied" : "Share link"}
          </button>
        </div>
      </header>

      <section className="relative z-10 grid flex-1 items-center gap-8 px-5 pb-8 md:grid-cols-[1fr_18rem] md:px-10 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col items-center text-center md:items-start md:text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-acid">
            Now speaking
          </p>
          <h1 className="mt-2 max-w-full truncate font-display text-[clamp(4rem,12vw,10rem)] leading-none tracking-wide">
            {currentName}
          </h1>
          <div
            aria-label={`${remaining} seconds remaining`}
            className={`mt-2 font-display text-[clamp(12rem,38vw,30rem)] leading-[0.72] tabular-nums ${
              remaining <= 10 ? "text-hot" : "text-paper"
            }`}
          >
            {displayRemaining}
          </div>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
            {slotSeconds <= 60 ? "seconds" : slotLabel(slotSeconds)} · advances
            automatically at zero
          </p>

          {unlocking ? (
            <p role="status" className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-acid">
              Payment received. Unlocking this room…
            </p>
          ) : null}

          {room?.paid && !room.isHost ? (
            <p className="mt-5 max-w-md font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
              Host this stand-up from another computer?{" "}
              <Link
                href="/login"
                className="text-paper/80 underline underline-offset-4 hover:text-acid"
              >
                Open my rooms
              </Link>{" "}
              with the Stripe email.
            </p>
          ) : null}

          {room?.isHost ? (
            <div className="mt-7 flex flex-col items-center gap-4 md:items-start">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => control("restart")}
                  disabled={busy}
                  className="border border-paper/30 px-5 py-3 font-display text-2xl tracking-wide hover:border-acid hover:text-acid disabled:opacity-50"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={() => control("skip")}
                  disabled={busy}
                  className="bg-acid px-5 py-3 font-display text-2xl tracking-wide text-ink disabled:opacity-50"
                >
                  Skip →
                </button>
              </div>
              {room.paid ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
                    Slot length
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SLOT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => control("slot", preset)}
                        disabled={busy}
                        className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] disabled:opacity-50 ${
                          slotSeconds === preset
                            ? "border-acid bg-acid text-ink"
                            : "border-paper/25 hover:border-acid hover:text-acid"
                        }`}
                      >
                        {slotLabel(preset)}
                      </button>
                    ))}
                  </div>
                  <form onSubmit={setCustomSlot} className="mt-3 flex items-center gap-2">
                    <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                      Custom minutes
                      <input
                        type="number"
                        min={1}
                        max={60}
                        step={1}
                        value={customMinutes}
                        onChange={(event) => setCustomMinutes(event.target.value)}
                        className="ml-2 w-16 border border-paper/25 bg-ink px-2 py-1 text-paper outline-none focus:border-acid"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy}
                      className="border border-paper/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] hover:border-acid hover:text-acid disabled:opacity-50"
                    >
                      Set
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/pay"
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/60 underline underline-offset-4 hover:text-acid"
                >
                  Unlock slot lengths · £19 or £3/mo
                </Link>
              )}
            </div>
          ) : null}
        </div>

        <aside className="border-t border-paper/20 pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-mute">
            Running order
          </p>
          <ol className="mt-4 space-y-2">
            {room?.roster.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className={`flex items-center gap-3 border px-3 py-2 ${
                  index === room.currentIndex
                    ? "border-acid bg-acid text-ink"
                    : "border-paper/15 text-paper/65"
                }`}
              >
                <span className="font-mono text-[10px]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-lg">{name}</span>
              </li>
            ))}
          </ol>

          {room && room.roster.length < maxPeople ? (
            <form onSubmit={join} className="mt-5">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
                Join this stand-up
              </label>
              <div className="mt-2 flex">
                <input
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder="Your name"
                  maxLength={30}
                  required
                  className="min-w-0 flex-1 border border-paper/25 bg-ink px-3 py-2 outline-none focus:border-acid"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-paper px-3 font-display text-xl tracking-wide text-ink disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </form>
          ) : null}

          {message ? (
            <p role="status" className="mt-4 text-sm text-hot">
              {message}
            </p>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
