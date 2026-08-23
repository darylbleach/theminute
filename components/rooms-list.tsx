"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ListedRoom = {
  code: string;
  name: string;
  isCurrentHost: boolean;
};

export function RoomsList({ rooms }: { rooms: ListedRoom[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function openAsHost(code: string) {
    setBusy(code);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}/host`, {
        method: "POST",
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !result.code) {
        throw new Error(result.error ?? "Could not host that room.");
      }
      router.push(`/r/${result.code}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not host that room.",
      );
      setBusy(null);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-xl text-paper/80">
        These stand-ups are unlocked on this Stripe email. Open one as host to
        skip, restart, and pick slot length.
      </p>
      <ul className="mt-8 space-y-3">
        {rooms.map((room) => (
          <li
            key={room.code}
            className="flex items-center justify-between gap-4 border border-paper/20 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-lg">{room.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                {room.code}
                {room.isCurrentHost ? " · host on this computer" : ""}
              </p>
            </div>
            {room.isCurrentHost ? (
              <Link
                href={`/r/${room.code}`}
                className="shrink-0 bg-acid px-3 py-2 font-display text-xl tracking-wide text-ink"
              >
                Open
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAsHost(room.code)}
                disabled={Boolean(busy)}
                className="shrink-0 border border-paper/30 px-3 py-2 font-display text-xl tracking-wide hover:border-acid hover:text-acid disabled:opacity-50"
              >
                {busy === room.code ? "Opening…" : "Host"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-hot">
          {error}
        </p>
      ) : null}
    </div>
  );
}
