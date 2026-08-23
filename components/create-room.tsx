"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoom } from "@/lib/rooms";

const ROSTER_KEY = "theminute:last-roster";
const ROOM_KEY = "theminute:room-code";
const EMPTY_ROSTER = ["", ""];

export function CreateRoom({
  hostRoom = null,
}: {
  hostRoom?: PublicRoom | null;
}) {
  const router = useRouter();
  const [roomName, setRoomName] = useState(hostRoom?.name ?? "Team stand-up");
  const [roster, setRoster] = useState(
    hostRoom?.roster.length ? hostRoom.roster : EMPTY_ROSTER,
  );
  const [lastCode, setLastCode] = useState<string | null>(hostRoom?.code ?? null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const paid = Boolean(hostRoom?.paid);
  const maxPeople = hostRoom?.maxPeople ?? 6;

  useEffect(() => {
    const restore = window.setTimeout(() => {
      if (hostRoom) {
        localStorage.setItem(ROOM_KEY, hostRoom.code);
        return;
      }
      try {
        const saved = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "null") as {
          roomName?: unknown;
          roster?: unknown;
        } | null;
        if (typeof saved?.roomName === "string") setRoomName(saved.roomName);
        if (
          Array.isArray(saved?.roster) &&
          saved.roster.length > 0 &&
          saved.roster.every((name) => typeof name === "string")
        ) {
          setRoster(saved.roster.slice(0, 6));
        }
        setLastCode(localStorage.getItem(ROOM_KEY));
      } catch {
        // Ignore malformed local data and use the friendly defaults.
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [hostRoom]);

  function updateName(index: number, value: string) {
    setRoster((current) =>
      current.map((name, nameIndex) => (nameIndex === index ? value : name)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= roster.length) return;
    setRoster((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  async function createRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = roster.map((name) => name.trim()).filter(Boolean);
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName, roster: names }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !result.code) {
        throw new Error(result.error ?? "Could not create the room.");
      }
      localStorage.setItem(
        ROSTER_KEY,
        JSON.stringify({ roomName, roster: names }),
      );
      localStorage.setItem(ROOM_KEY, result.code);
      router.push(`/r/${result.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-acid">
          One minute. Then move on.
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(4.5rem,13vw,10rem)] leading-[0.78] tracking-wide">
          Stand-ups that stay standing.
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-paper/70 md:text-2xl">
          Create a room, share the link, and give everyone 60 seconds. No
          account. No install. No wandering monologues.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
          <span>{paid ? "Unlocked room" : "Free room"}</span>
          <span>Up to {maxPeople} people</span>
          <span>Works on any screen</span>
        </div>
      </div>

      <form
        onSubmit={createRoom}
        className="border border-paper/20 bg-paper/[0.04] p-5 sm:p-7"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-acid">
              Start a room
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide">
              Running order
            </h2>
          </div>
          {lastCode ? (
            <a
              href={`/r/${lastCode}`}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/60 underline underline-offset-4 hover:text-acid"
            >
              Reopen room
            </a>
          ) : null}
        </div>

        <label className="mt-6 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
            Room name
          </span>
          <input
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            maxLength={50}
            required
            className="mt-2 w-full border border-paper/25 bg-ink px-4 py-3 text-lg outline-none focus:border-acid"
          />
        </label>

        <div className="mt-5 space-y-2">
          {roster.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 font-mono text-xs text-mute">
                {String(index + 1).padStart(2, "0")}
              </span>
              <input
                value={name}
                onChange={(event) => updateName(index, event.target.value)}
                placeholder={index === 0 ? "First person" : "Next person"}
                maxLength={30}
                aria-label={`Person ${index + 1}`}
                className="min-w-0 flex-1 border border-paper/20 bg-ink px-3 py-2.5 outline-none placeholder:text-mute/60 focus:border-acid"
              />
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${name || `person ${index + 1}`} up`}
                className="px-1.5 py-2 text-mute hover:text-acid disabled:opacity-20"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === roster.length - 1}
                aria-label={`Move ${name || `person ${index + 1}`} down`}
                className="px-1.5 py-2 text-mute hover:text-acid disabled:opacity-20"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  setRoster((current) =>
                    current.length === 1
                      ? [""]
                      : current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                aria-label={`Remove ${name || `person ${index + 1}`}`}
                className="px-1.5 py-2 text-mute hover:text-hot"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {roster.length < maxPeople ? (
          <button
            type="button"
            onClick={() => setRoster((current) => [...current, ""])}
            className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60 hover:text-acid"
          >
            + Add person
          </button>
        ) : (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
            {paid ? `Limit: ${maxPeople} people` : "Free limit: 6 people"}
          </p>
        )}

        {error ? (
          <p role="alert" className="mt-4 text-sm text-hot">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full bg-acid px-5 py-4 font-display text-3xl tracking-wide text-ink disabled:opacity-50"
        >
          {submitting ? "Opening…" : lastCode ? "Restart room" : "Create room"}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] leading-relaxed tracking-[0.08em] text-mute">
          {paid
            ? "Your roster is saved on this room."
            : "Your roster is remembered on this browser."}
        </p>
      </form>
    </div>
  );
}
