import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { RoomsList } from "@/components/rooms-list";
import {
  findHostRoom,
  findPaidRoomsByEmail,
  HOST_COOKIE,
} from "@/lib/rooms";

export const metadata: Metadata = {
  title: "My rooms",
  description: "Paid stand-up rooms on this Stripe email.",
  robots: { index: false, follow: false },
};

export default async function RoomsPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  if (!token) redirect("/login");

  let hostRoom = null;
  try {
    hostRoom = await findHostRoom(token);
  } catch {
    redirect("/login");
  }

  if (!hostRoom?.paid || !hostRoom.paidEmail) redirect("/login");

  const rooms = await findPaidRoomsByEmail(hostRoom.paidEmail);
  if (rooms.length === 0) redirect("/login");
  if (rooms.length === 1) redirect(`/r/${rooms[0].code}`);

  return (
    <PageShell kicker="Paid rooms" title="Your stand-ups.">
      <RoomsList
        rooms={rooms.map((room) => ({
          code: room.code,
          name: room.name,
          isCurrentHost: room.code === hostRoom.code,
        }))}
      />
    </PageShell>
  );
}
