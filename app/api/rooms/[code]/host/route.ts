import { cookies } from "next/headers";
import { claimPaidRoomHost, HOST_COOKIE, hostCookieOptions } from "@/lib/rooms";

export const runtime = "nodejs";

async function roomCode(context: RouteContext<"/api/rooms/[code]/host">) {
  const { code } = await context.params;
  return code;
}

export async function POST(
  _request: Request,
  context: RouteContext<"/api/rooms/[code]/host">,
) {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  if (!token) {
    return Response.json(
      { error: "Open your rooms with the email from Stripe checkout." },
      { status: 401 },
    );
  }

  try {
    const claimed = await claimPaidRoomHost(token, await roomCode(context));
    const cookieStore = await cookies();
    cookieStore.set(HOST_COOKIE, claimed.token, hostCookieOptions());
    return Response.json(
      { code: claimed.room.code },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not host that room.";
    if (message.includes("DATABASE_URL")) {
      return Response.json(
        { error: "Database is not configured yet." },
        { status: 503 },
      );
    }
    return Response.json({ error: message }, { status: 403 });
  }
}
