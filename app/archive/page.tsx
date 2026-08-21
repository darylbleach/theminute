import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { formatDuration } from "@/lib/format";
import { loadArchive } from "@/lib/queue";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const rows = await loadArchive(60).catch(() => []);
  return (
    <PageShell kicker="Hall of reigns" title="They held the internet.">
      <p className="mb-8 max-w-2xl text-paper/75">
        Every reign is frozen here. The screenshot is the artifact. This is the
        board you cannot buy retroactively.
      </p>
      {rows.length === 0 ? (
        <p className="font-mono text-sm text-mute">No archived reigns yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => {
            const seconds =
              row.startedAt && row.endsAt
                ? Math.max(
                    0,
                    Math.round(
                      (row.endsAt.getTime() - row.startedAt.getTime()) / 1000,
                    ),
                  )
                : row.minutesPaid * 60;
            return (
              <li key={row.id} className="border border-paper/15 p-5">
                <Link href={`/reign/${row.id}`} className="block">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
                    {row.status}
                    {row.isSeeded ? " · seed" : ""}
                  </p>
                  <p className="font-display text-4xl tracking-wide">
                    {row.hostname}
                  </p>
                  <p className="text-paper/70">{row.tagline}</p>
                  <p className="mt-3 font-mono text-sm text-acid">
                    Held for {formatDuration(seconds)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
