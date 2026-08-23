import { cookies } from "next/headers";
import Link from "next/link";
import { CreateRoom } from "@/components/create-room";
import { SiteNav } from "@/components/site-nav";
import { findHostRoom, HOST_COOKIE, publicRoom } from "@/lib/rooms";

export default async function HomePage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  let hostRoom = null;
  if (token && process.env.DATABASE_URL) {
    try {
      const room = await findHostRoom(token);
      if (room) hostRoom = publicRoom(room, token);
    } catch {
      hostRoom = null;
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-paper">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(243,238,228,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(243,238,228,0.05) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <SiteNav />
      <section className="relative mx-auto w-full max-w-7xl px-5 pb-20 pt-28 md:px-10 md:pt-36">
        <CreateRoom hostRoom={hostRoom} />
        <footer className="mt-16 flex flex-col gap-3 border-t border-paper/15 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>Free for one room · no account required</span>
          {hostRoom?.paid ? (
            <Link href="/login" className="hover:text-acid">
              Open from any computer with the Stripe email
            </Link>
          ) : (
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/pay" className="hover:text-acid">
                Unlock saved teams · £19 once or £3/mo
              </Link>
              <Link href="/login" className="hover:text-acid">
                Open my rooms
              </Link>
            </span>
          )}
        </footer>
      </section>
    </main>
  );
}
