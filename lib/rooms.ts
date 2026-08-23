import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, rooms, type Room } from "@/db";

export const HOST_COOKIE = "theminute_host";
export const PERSON_SECONDS = 60;
export const MAX_PEOPLE = 6;

export type PublicRoom = {
  code: string;
  name: string;
  roster: string[];
  currentIndex: number;
  endsAt: string;
  serverNow: string;
  isHost: boolean;
};

export function cleanRoomName(value: unknown) {
  if (typeof value !== "string") throw new Error("Name your room.");
  const name = value.replace(/\s+/g, " ").trim();
  if (!name) throw new Error("Name your room.");
  if (name.length > 50) throw new Error("Keep the room name under 50 characters.");
  return name;
}

export function cleanPersonName(value: unknown) {
  if (typeof value !== "string") throw new Error("Enter a name.");
  const name = value.replace(/\s+/g, " ").trim();
  if (!name) throw new Error("Enter a name.");
  if (name.length > 30) throw new Error("Keep names under 30 characters.");
  return name;
}

export function cleanRoster(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Add at least one person.");
  const roster = value.map(cleanPersonName);
  if (roster.length < 1) throw new Error("Add at least one person.");
  if (roster.length > MAX_PEOPLE) {
    throw new Error(`Free rooms are limited to ${MAX_PEOPLE} people.`);
  }
  return roster;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function makeHostToken() {
  return randomBytes(32).toString("base64url");
}

export function makeRoomCode() {
  return randomBytes(3).toString("hex");
}

export async function loadCurrentRoom(code: string) {
  const db = getDb();
  let room = await db.query.rooms.findFirst({ where: eq(rooms.code, code) });
  if (!room) return null;

  const now = Date.now();
  const end = room.endsAt.getTime();
  if (room.roster.length > 0 && end <= now) {
    const steps = Math.floor((now - end) / (PERSON_SECONDS * 1000)) + 1;
    const nextIndex = (room.currentIndex + steps) % room.roster.length;
    const nextEndsAt = new Date(end + steps * PERSON_SECONDS * 1000);
    const [advanced] = await db
      .update(rooms)
      .set({
        currentIndex: nextIndex,
        endsAt: nextEndsAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rooms.code, room.code),
          eq(rooms.currentIndex, room.currentIndex),
          eq(rooms.endsAt, room.endsAt),
        ),
      )
      .returning();
    room =
      advanced ??
      (await db.query.rooms.findFirst({ where: eq(rooms.code, code) })) ??
      room;
  }

  return room;
}

export function publicRoom(room: Room, hostToken?: string): PublicRoom {
  return {
    code: room.code,
    name: room.name,
    roster: room.roster,
    currentIndex: room.currentIndex,
    endsAt: room.endsAt.toISOString(),
    serverNow: new Date().toISOString(),
    isHost: Boolean(
      hostToken && hashToken(hostToken) === room.hostTokenHash,
    ),
  };
}

export async function joinRoom(code: string, name: string) {
  const db = getDb();
  const [updated] = await db
    .update(rooms)
    .set({
      roster: sql`${rooms.roster} || ${JSON.stringify([name])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(rooms.code, code),
        sql`jsonb_array_length(${rooms.roster}) < ${MAX_PEOPLE}`,
      ),
    )
    .returning();
  return updated ?? null;
}
