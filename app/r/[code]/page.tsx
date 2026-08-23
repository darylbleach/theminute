import type { Metadata } from "next";
import { RoomTimer } from "@/components/room-timer";

export const metadata: Metadata = {
  title: "Standup room",
  description: "A shared one-minute standup timer.",
  robots: { index: false, follow: false },
};

export default async function RoomPage({
  params,
}: PageProps<"/r/[code]">) {
  const { code } = await params;
  return <RoomTimer code={code} />;
}
