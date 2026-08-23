import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";
import { destinationAfterLogin } from "@/lib/login";
import {
  findHostRoom,
  findPaidRoomsByEmail,
  HOST_COOKIE,
} from "@/lib/rooms";

export const metadata: Metadata = {
  title: "Open my rooms",
  description:
    "Open a paid stand-up room from any computer with the email used at Stripe checkout. No password.",
  robots: { index: false, follow: false },
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  if (token && process.env.DATABASE_URL) {
    try {
      const hostRoom = await findHostRoom(token);
      if (hostRoom?.paid && hostRoom.paidEmail) {
        const rooms = await findPaidRoomsByEmail(hostRoom.paidEmail);
        const destination = destinationAfterLogin(rooms);
        if (destination) redirect(destination);
      }
    } catch {
      // Fall through to the email form if the host cookie is stale.
    }
  }

  const error = firstQueryValue((await searchParams).error);
  return (
    <PageShell kicker="Paid rooms" title="Open my rooms.">
      <LoginForm initialError={error ?? ""} />
    </PageShell>
  );
}
