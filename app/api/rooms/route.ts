import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, rooms } from "@/db";
import {
  cleanRoomName,
  cleanRoster,
  findHostRoom,
  hashToken,
  HOST_COOKIE,
  makeHostToken,
  makeRoomCode,
  maxPeopleFor,
  publicRoom,
  slotSecondsFor,
} from "@/lib/rooms";

async function hostTokenFromCookie() {
  return (await cookies()).get(HOST_COOKIE)?.value;
}

export async function GET() {
  const token = await hostTokenFromCookie();
  if (!token) {
    return Response.json({ room: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  try {
    const room = await findHostRoom(token);
    return Response.json(
      { room: room ? publicRoom(room, token) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ room: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; roster?: unknown };
    const cookieStore = await cookies();
    let hostToken = cookieStore.get(HOST_COOKIE)?.value;

    if (!hostToken) {
      hostToken = makeHostToken();
      cookieStore.set(HOST_COOKIE, hostToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    const db = getDb();
    const hostTokenHash = hashToken(hostToken);
    const existing = await db.query.rooms.findFirst({
      where: eq(rooms.hostTokenHash, hostTokenHash),
    });
    const name = cleanRoomName(body.name);
    const roster = cleanRoster(body.roster, existing ? maxPeopleFor(existing) : 6);
    const slot = existing ? slotSecondsFor(existing) : 60;
    const endsAt = new Date(Date.now() + slot * 1000);

    if (existing) {
      await db
        .update(rooms)
        .set({
          name,
          roster,
          currentIndex: 0,
          endsAt,
          updatedAt: new Date(),
        })
        .where(eq(rooms.code, existing.code));
      return Response.json({ code: existing.code });
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = makeRoomCode();
      const [created] = await db
        .insert(rooms)
        .values({ code, name, roster, endsAt, hostTokenHash })
        .onConflictDoNothing()
        .returning({ code: rooms.code });
      if (created) return Response.json(created, { status: 201 });
    }

    const racedRoom = await db.query.rooms.findFirst({
      where: eq(rooms.hostTokenHash, hostTokenHash),
      columns: { code: true },
    });
    if (racedRoom) return Response.json(racedRoom);

    return Response.json(
      { error: "Could not create a room. Try again." },
      { status: 503 },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid room." },
      { status: 400 },
    );
  }
}
