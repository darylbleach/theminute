import { LOGIN_SENT_MESSAGE } from "@/lib/login-copy";
import { requestPaidRoomLogin } from "@/lib/login";
import { clientIpFromHeaders } from "@/lib/login-lockout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = (json as { email?: unknown }).email;
  try {
    await requestPaidRoomLogin(email, clientIpFromHeaders(request.headers));
    return Response.json(
      { ok: true, message: LOGIN_SENT_MESSAGE },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not send a login email.";
    if (message.includes("DATABASE_URL")) {
      return Response.json(
        { error: "Database is not configured yet." },
        { status: 503 },
      );
    }
    if (message.includes("RESEND_API_KEY") || message.includes("Resend")) {
      return Response.json({ error: message }, { status: 503 });
    }
    if (message.includes("Wait a few seconds") || message.includes("Too many")) {
      return Response.json({ error: message }, { status: 429 });
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
