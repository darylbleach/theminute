import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const runtime = "nodejs";
export const alt = "The Minute — a one-minute stand-up timer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div style={{ fontSize: 36, letterSpacing: 8, color: "#d6ff3d" }}>
          {SITE_NAME.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, lineHeight: 0.9 }}>
            STANDUPS THAT STAY STANDING
          </div>
          <div style={{ fontSize: 42, marginTop: 24, color: "#d6ff3d" }}>
            60 seconds each. Then move on.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
