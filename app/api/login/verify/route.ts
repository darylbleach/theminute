import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  completePaidRoomLogin,
  destinationAfterLogin,
} from "@/lib/login";
import { clientIpFromHeaders } from "@/lib/login-lockout";
import { HOST_COOKIE, hostCookieOptions } from "@/lib/rooms";

export const runtime = "nodejs";

function isFormRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

async function readVerifyInput(request: Request) {
  if (isFormRequest(request)) {
    const form = await request.formData();
    return {
      token: form.get("token"),
      email: form.get("email"),
      code: form.get("code"),
    };
  }
  try {
    return (await request.json()) as {
      token?: unknown;
      email?: unknown;
      code?: unknown;
    };
  } catch {
    throw new Error("Invalid JSON.");
  }
}

function loginErrorUrl(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function POST(request: Request) {
  const form = isFormRequest(request);
  try {
    const body = await readVerifyInput(request);
    const currentHostToken = (await cookies()).get(HOST_COOKIE)?.value;
    const input =
      typeof body.token === "string" && body.token.trim()
        ? { token: body.token }
        : { email: String(body.email ?? ""), code: String(body.code ?? "") };

    const { hostToken, rooms } = await completePaidRoomLogin(
      input,
      currentHostToken,
      clientIpFromHeaders(request.headers),
    );
    const destination = destinationAfterLogin(rooms);
    if (!destination || !hostToken) {
      throw new Error(
        "No unlocked stand-up rooms for this email. Unlock a room at checkout first.",
      );
    }

    if (form) {
      const response = NextResponse.redirect(new URL(destination, request.url), 303);
      response.cookies.set(HOST_COOKIE, hostToken, hostCookieOptions());
      return response;
    }

    const cookieStore = await cookies();
    cookieStore.set(HOST_COOKIE, hostToken, hostCookieOptions());
    return Response.json(
      { url: destination },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not open your rooms.";
    if (form) {
      return NextResponse.redirect(
        new URL(loginErrorUrl(message), request.url),
        303,
      );
    }
    if (message.includes("DATABASE_URL")) {
      return Response.json(
        { error: "Database is not configured yet." },
        { status: 503 },
      );
    }
    if (message.includes("Too many")) {
      return Response.json({ error: message }, { status: 429 });
    }
    const status =
      message.includes("not valid") ||
      message.includes("expired") ||
      message.includes("already been used") ||
      message.includes("No unlocked")
        ? 401
        : 400;
    return Response.json({ error: message }, { status });
  }
}
