import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, rooms, type Database, type DbTransaction, type Room } from "@/db";

export const HOST_COOKIE = "theminute_host";
export const HOST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const FREE_SLOT_SECONDS = 60;
export const PERSON_SECONDS = FREE_SLOT_SECONDS;
export const FREE_MAX_PEOPLE = 6;
export const MAX_PEOPLE = FREE_MAX_PEOPLE;
export const PAID_MAX_PEOPLE = 50;
export const SLOT_PRESETS = [30, 60, 120, 300] as const;
export const MAX_CUSTOM_MINUTES = 60;

export type PublicRoom = {
  code: string;
  name: string;
  roster: string[];
  currentIndex: number;
  endsAt: string;
  serverNow: string;
  isHost: boolean;
  paid: boolean;
  slotSeconds: number;
  maxPeople: number;
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

export function maxPeopleFor(room: Pick<Room, "paid">) {
  return room.paid ? PAID_MAX_PEOPLE : FREE_MAX_PEOPLE;
}

export function slotSecondsFor(room: Pick<Room, "paid" | "slotSeconds">) {
  if (!room.paid) return FREE_SLOT_SECONDS;
  return room.slotSeconds > 0 ? room.slotSeconds : FREE_SLOT_SECONDS;
}

export function cleanRoster(value: unknown, maxPeople = FREE_MAX_PEOPLE) {
  if (!Array.isArray(value)) throw new Error("Add at least one person.");
  const roster = value.map(cleanPersonName);
  if (roster.length < 1) throw new Error("Add at least one person.");
  if (roster.length > maxPeople) {
    throw new Error(
      maxPeople <= FREE_MAX_PEOPLE
        ? `Free rooms are limited to ${FREE_MAX_PEOPLE} people.`
        : `Keep the roster under ${maxPeople} people.`,
    );
  }
  return roster;
}

export function cleanSlotSeconds(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 30) {
    throw new Error("Pick a slot length.");
  }
  if ((SLOT_PRESETS as readonly number[]).includes(n)) return n;
  if (n % 60 !== 0) {
    throw new Error("Custom slots are a whole number of minutes.");
  }
  const minutes = n / 60;
  if (minutes < 1 || minutes > MAX_CUSTOM_MINUTES) {
    throw new Error(`Custom slots can be 1–${MAX_CUSTOM_MINUTES} minutes.`);
  }
  return n;
}

export function slotLabel(slotSeconds: number) {
  if (slotSeconds < 60) return `${slotSeconds}s`;
  const minutes = slotSeconds / 60;
  if (Number.isInteger(minutes)) {
    return minutes === 1 ? "1 min" : `${minutes} min`;
  }
  return `${slotSeconds}s`;
}

export function applyFreeLimits(room: Room) {
  const roster = room.roster.slice(0, FREE_MAX_PEOPLE);
  const currentIndex =
    roster.length === 0 ? 0 : Math.min(room.currentIndex, roster.length - 1);
  return {
    paid: false,
    slotSeconds: FREE_SLOT_SECONDS,
    stripeSubscriptionId: null,
    roster,
    currentIndex,
    endsAt: new Date(Date.now() + FREE_SLOT_SECONDS * 1000),
    updatedAt: new Date(),
  };
}

export function hostCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HOST_COOKIE_MAX_AGE,
  };
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
  const slot = slotSecondsFor(room);
  if (room.roster.length > 0 && end <= now) {
    const steps = Math.floor((now - end) / (slot * 1000)) + 1;
    const nextIndex = (room.currentIndex + steps) % room.roster.length;
    const nextEndsAt = new Date(end + steps * slot * 1000);
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
    paid: Boolean(room.paid),
    slotSeconds: slotSecondsFor(room),
    maxPeople: maxPeopleFor(room),
  };
}

type RoomsDb = Database | DbTransaction;

export async function findHostRoom(hostToken: string, db: RoomsDb = getDb()) {
  return (
    (await db.query.rooms.findFirst({
      where: eq(rooms.hostTokenHash, hashToken(hostToken)),
    })) ?? null
  );
}

export async function findPaidRoomsByEmail(
  email: string,
  db: RoomsDb = getDb(),
) {
  return db
    .select()
    .from(rooms)
    .where(and(eq(rooms.paidEmail, email), eq(rooms.paid, true)))
    .orderBy(desc(rooms.updatedAt));
}

export function canClaimPaidRoom(
  current: Pick<Room, "paid" | "paidEmail" | "code"> | null,
  target: Pick<Room, "paid" | "paidEmail" | "code"> | null,
) {
  if (!current || !target) return false;
  if (!current.paid || !target.paid) return false;
  if (!current.paidEmail || !target.paidEmail) return false;
  return current.paidEmail === target.paidEmail;
}

export async function rotateHostToken(code: string, db: RoomsDb = getDb()) {
  const token = makeHostToken();
  const [updated] = await db
    .update(rooms)
    .set({
      hostTokenHash: hashToken(token),
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, code))
    .returning({ code: rooms.code });
  if (!updated) throw new Error("Room not found.");
  return token;
}

export async function claimPaidRoomHost(
  hostToken: string,
  code: string,
  db: RoomsDb = getDb(),
) {
  const current = await findHostRoom(hostToken, db);
  const target =
    (await db.query.rooms.findFirst({ where: eq(rooms.code, code) })) ?? null;
  if (!canClaimPaidRoom(current, target) || !current || !target) {
    throw new Error("Host this stand-up with the email from Stripe checkout.");
  }
  if (current.code === target.code) {
    return { token: hostToken, room: target };
  }
  const token = await rotateHostToken(target.code, db);
  return { token, room: target };
}

export async function joinRoom(code: string, name: string) {
  const db = getDb();
  const room = await db.query.rooms.findFirst({ where: eq(rooms.code, code) });
  if (!room) return null;
  const max = maxPeopleFor(room);
  const [updated] = await db
    .update(rooms)
    .set({
      roster: sql`${rooms.roster} || ${JSON.stringify([name])}::jsonb`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(rooms.code, code),
        sql`jsonb_array_length(${rooms.roster}) < ${max}`,
      ),
    )
    .returning();
  return updated ?? null;
}
