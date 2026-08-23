import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, rooms } from "@/db";
import {
  cleanPersonName,
  hashToken,
  HOST_COOKIE,
  joinRoom,
  loadCurrentRoom,
  PERSON_SECONDS,
  publicRoom,
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
        columns: { code: true },
      });
      return Response.json(
        { error: exists ? "This room already has 6 people." : "Room not found." },
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

  const body = (await request.json()) as { action?: unknown };
  if (body.action !== "skip" && body.action !== "restart") {
    return Response.json({ error: "Unknown control." }, { status: 400 });
  }

  const currentIndex =
    body.action === "skip"
      ? (room.currentIndex + 1) % room.roster.length
      : room.currentIndex;
  const [updated] = await getDb()
    .update(rooms)
    .set({
      currentIndex,
      endsAt: new Date(Date.now() + PERSON_SECONDS * 1000),
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, code))
    .returning();

  return Response.json(publicRoom(updated, token));
}
