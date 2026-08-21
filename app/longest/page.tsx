import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { formatDuration } from "@/lib/format";
import { loadLongest } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function LongestPage() {
  const rows = await loadLongest(25).catch(() => []);
  return (
    <PageShell kicker="All-time" title="Longest reigns.">
      <p className="mb-8 max-w-2xl text-paper/75">
        You can buy more minutes. You cannot rewrite how long someone already
        held the page.
      </p>
      <ol className="flex flex-col divide-y divide-paper/10 border border-paper/15">
        {rows.map((row, index) => (
          <li key={row.reign.id} className="flex items-baseline justify-between gap-4 p-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
                #{index + 1}
              </p>
              <Link href={`/reign/${row.reign.id}`} className="font-display text-4xl tracking-wide">
                {row.reign.hostname}
              </Link>
            </div>
            <p className="font-mono text-acid">{formatDuration(row.seconds)}</p>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
