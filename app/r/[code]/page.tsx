import type { Metadata } from "next";
import { RoomTimer } from "@/components/room-timer";

export const metadata: Metadata = {
  title: "Stand-up room",
  description: "A shared one-minute stand-up timer.",
  robots: { index: false, follow: false },
};

export default async function RoomPage({
  params,
  searchParams,
}: PageProps<"/r/[code]">) {
  const { code } = await params;
  const { checkout } = await searchParams;
  return <RoomTimer code={code} checkoutSuccess={checkout === "success"} />;
}
