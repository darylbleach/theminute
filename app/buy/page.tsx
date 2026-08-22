import { BuyForm } from "@/components/buy-form";
import { PageShell } from "@/components/page-shell";
import { loadPublicState } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const params = await searchParams;
  const action =
    params.action === "cut" || params.action === "defend" ? params.action : "buy";
  let state = null;
  try {
    state = await loadPublicState();
  } catch {
    state = null;
  }

  return (
    <PageShell kicker="Checkout" title="Buy the minute.">
      <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <BuyForm state={state} defaultAction={action} />
        <aside className="flex flex-col gap-4 border border-paper/15 p-6 font-mono text-sm text-paper/75">
          <p>$1 = 1 minute. Minimum 5.</p>
          <p>
            Your URL, logo, and one line own the whole viewport until the clock
            hits zero. Then the next paid URL slams in.
          </p>
          <p>
            Logo is optional. Paste a link to your own PNG or SVG, or leave it
            blank and we pull the favicon from your domain.
          </p>
          <p>
            Cutting the line costs 2× the remaining minutes of everyone you
            skip. 80% of that premium is credited to them. 20% is the house.
          </p>
          <p>
            The current holder can defend live: same email, extra minutes, clock
            extends while people are watching.
          </p>
          {state?.live ? (
            <p>
              Live now: {state.live.hostname} · {state.queue.length} waiting.
            </p>
          ) : (
            <p>Nobody is live. Your purchase can take the page immediately.</p>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
