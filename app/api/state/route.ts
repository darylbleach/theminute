import { loadPublicState } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await loadPublicState();
    return Response.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "State is unavailable.";
    return Response.json(
      { error: message, serverNow: new Date().toISOString() },
      { status: 503 },
    );
  }
}
