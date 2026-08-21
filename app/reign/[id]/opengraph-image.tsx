import { ImageResponse } from "next/og";
import { formatDuration } from "@/lib/format";
import { loadReign } from "@/lib/queue";

export const runtime = "nodejs";
export const alt = "Reign card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ReignImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reign = await loadReign(id);
  const hostname = reign?.hostname ?? "theminute.lol";
  const start = reign?.startedAt ?? reign?.createdAt;
  const end = reign?.endsAt ?? start;
  const seconds =
    start && end
      ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))
      : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070707",
          color: "#f3eee4",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#d6ff3d" }}>
          THE MINUTE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 0.9 }}>{hostname}</div>
          <div style={{ fontSize: 40, marginTop: 28, color: "#d6ff3d" }}>
            held the internet for {formatDuration(seconds)}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
