import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";

export function PageShell({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-dvh bg-ink text-paper">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-28 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-acid">
          {kicker}
        </p>
        <h1 className="mt-3 font-display text-6xl tracking-wide md:text-8xl">
          {title}
        </h1>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}
