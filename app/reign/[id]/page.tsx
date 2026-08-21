import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { formatDuration } from "@/lib/format";
import { loadReign } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const reign = await loadReign(id);
  if (!reign) return { title: "Reign" };
  return {
    title: `${reign.hostname} held the internet`,
    description: reign.tagline,
    openGraph: {
      title: `${reign.hostname} held the internet`,
      description: reign.tagline,
    },
  };
}

export default async function ReignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reign = await loadReign(id);
  if (!reign) notFound();
  const start = reign.startedAt ?? reign.createdAt;
  const end = reign.endsAt ?? start;
  const seconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));

  return (
    <PageShell kicker="Reign card" title={reign.hostname}>
      <p className="max-w-2xl text-2xl text-paper/80">{reign.tagline}</p>
      <p className="mt-6 font-display text-6xl text-acid">
        Held the internet for {formatDuration(seconds)}.
      </p>
      <p className="mt-4 font-mono text-sm text-mute">
        {reign.clickCount} clicks · {reign.minutesPaid} minutes bought
        {reign.jumpedQueue ? " · cut the line" : ""}
      </p>
      <a
        href={`/go/${reign.id}`}
        rel="nofollow sponsored noopener"
        className="mt-8 inline-block bg-acid px-5 py-3 font-display text-2xl text-ink"
      >
        Visit {reign.hostname}
      </a>
    </PageShell>
  );
}
