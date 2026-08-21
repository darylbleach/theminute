import { incrementClicks } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await incrementClicks(id);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }
  return Response.redirect(row.url, 302);
}
