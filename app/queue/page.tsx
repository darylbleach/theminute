import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { formatDuration } from "@/lib/format";
import { loadPublicState } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const state = await loadPublicState().catch(() => null);
  if (!state) {
    return (
      <PageShell kicker="Public queue" title="Who is next.">
        <p className="font-mono text-sm text-mute">Queue is waking up.</p>
      </PageShell>
    );
  }
  return (
    <PageShell kicker="Public queue" title="Who is next.">
      <p className="mb-8 max-w-2xl text-paper/75">
        Anticipation is the product. Everyone can see who is coming and how long
        until they land. Nobody can steal minutes you already paid for.
      </p>
      {state.queue.length === 0 ? (
        <p className="font-mono text-sm text-mute">
          Queue is empty.{" "}
          <Link href="/buy" className="text-acid">
            Buy the next minutes.
          </Link>
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-paper/10 border border-paper/15">
          {state.queue.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
                  #{index + 1}
                  {item.jumpedQueue ? " · cut" : ""}
                </p>
                <p className="font-display text-4xl tracking-wide">{item.hostname}</p>
                <p className="text-paper/70">{item.tagline}</p>
              </div>
              <p className="font-mono text-sm text-acid">
                {formatDuration(item.minutesPaid * 60)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </PageShell>
  );
}
