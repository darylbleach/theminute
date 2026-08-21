import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let hostname: string | null = null;
  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      hostname = session.metadata?.hostname ?? null;
    } catch {
      hostname = null;
    }
  }

  return (
    <PageShell kicker="Paid" title="You're on the clock.">
      <p className="max-w-2xl text-xl text-paper/80">
        {hostname
          ? `${hostname} is in. Watch the queue. When the live countdown hits zero, the next URL slams in.`
          : "Payment received. Watch the homepage for your takeover."}
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="bg-acid px-5 py-3 font-display text-2xl text-ink">
          Watch live
        </Link>
        <Link href="/queue" className="border border-paper/30 px-5 py-3 font-display text-2xl">
          See the queue
        </Link>
      </div>
    </PageShell>
  );
}
