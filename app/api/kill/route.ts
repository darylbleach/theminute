import { killLiveReign, setSiteKilled } from "@/lib/queue";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.KILL_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-kill-secret");
  const bearer = request.headers.get("authorization");
  return header === secret || bearer === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { action?: string; reason?: string } = {};
  try {
    body = (await request.json()) as { action?: string; reason?: string };
  } catch {
    body = {};
  }

  const reason = body.reason?.trim() || "Taken down by the operator.";
  if (body.action === "pause") {
    await setSiteKilled(true, reason);
    return Response.json({ ok: true, paused: true });
  }
  if (body.action === "resume") {
    await setSiteKilled(false, null);
    return Response.json({ ok: true, paused: false });
  }

  await killLiveReign(reason);
  return Response.json({ ok: true, killed: true });
}
