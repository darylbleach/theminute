import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, rooms } from "@/db";
import {
  cleanPersonName,
  cleanSlotSeconds,
  hashToken,
  HOST_COOKIE,
  joinRoom,
  loadCurrentRoom,
  maxPeopleFor,
  publicRoom,
  slotSecondsFor,
} from "@/lib/rooms";

async function roomCode(context: RouteContext<"/api/rooms/[code]">) {
  const { code } = await context.params;
  return code;
}

async function hostToken() {
  return (await cookies()).get(HOST_COOKIE)?.value;
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/rooms/[code]">,
) {
  const room = await loadCurrentRoom(await roomCode(context));
  if (!room) {
    return Response.json({ error: "Room not found." }, { status: 404 });
  }
  return Response.json(publicRoom(room, await hostToken()), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/rooms/[code]">,
) {
  try {
    const code = await roomCode(context);
    const body = (await request.json()) as { name?: unknown };
    const updated = await joinRoom(code, cleanPersonName(body.name));
    if (!updated) {
      const exists = await getDb().query.rooms.findFirst({
        where: eq(rooms.code, code),
      });
      return Response.json(
        {
          error: exists
            ? `This room already has ${maxPeopleFor(exists)} people.`
            : "Room not found.",
        },
        { status: exists ? 409 : 404 },
      );
    }
    return Response.json(publicRoom(updated, await hostToken()));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid name." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/rooms/[code]">,
) {
  const code = await roomCode(context);
  const token = await hostToken();
  const room = await loadCurrentRoom(code);
  if (!room) {
    return Response.json({ error: "Room not found." }, { status: 404 });
  }
  if (!token || hashToken(token) !== room.hostTokenHash) {
    return Response.json({ error: "Host controls only." }, { status: 403 });
  }

  const body = (await request.json()) as {
    action?: unknown;
    slotSeconds?: unknown;
  };
  if (
    body.action !== "skip" &&
    body.action !== "restart" &&
    body.action !== "slot"
  ) {
    return Response.json({ error: "Unknown control." }, { status: 400 });
  }

  if (body.action === "slot") {
    if (!room.paid) {
      return Response.json(
        { error: "Unlock this room to change slot length." },
        { status: 403 },
      );
    }
    let slotSeconds: number;
    try {
      slotSeconds = cleanSlotSeconds(body.slotSeconds);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid slot." },
        { status: 400 },
      );
    }
    const [updated] = await getDb()
      .update(rooms)
      .set({
        slotSeconds,
        endsAt: new Date(Date.now() + slotSeconds * 1000),
        updatedAt: new Date(),
      })
      .where(eq(rooms.code, code))
      .returning();
    return Response.json(publicRoom(updated, token));
  }

  const slot = slotSecondsFor(room);
  const currentIndex =
    body.action === "skip"
      ? (room.currentIndex + 1) % room.roster.length
      : room.currentIndex;
  const [updated] = await getDb()
    .update(rooms)
    .set({
      currentIndex,
      endsAt: new Date(Date.now() + slot * 1000),
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, code))
    .returning();

  return Response.json(publicRoom(updated, token));
}
