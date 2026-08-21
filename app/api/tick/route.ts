import { advanceClock, withQueueLock } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await withQueueLock((tx) => advanceClock(tx));
  return Response.json({
    ok: true,
    liveId: result.live?.id ?? null,
    promotedId: result.promoted?.id ?? null,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
