import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

const links = [{ href: "/", label: "New room" }];

export function SiteNav({ live }: { live?: boolean }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-4 md:flex-row md:items-start md:justify-between md:gap-6 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="pointer-events-auto whitespace-nowrap font-display text-2xl leading-none tracking-wide text-acid sm:text-3xl md:text-4xl"
        >
          {SITE_NAME}
        </Link>
        {live ? (
          <span className="pointer-events-auto flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-hot md:hidden">
            <span className="size-2 animate-pulse rounded-full bg-hot" />
            Live
          </span>
        ) : null}
      </div>
      <nav className="pointer-events-auto flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/80 sm:tracking-[0.18em] md:justify-end md:gap-4 md:text-[11px]">
        {live ? (
          <span className="hidden items-center gap-2 text-hot md:flex">
            <span className="size-2 animate-pulse rounded-full bg-hot" />
            Live
          </span>
        ) : null}
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap hover:text-acid"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
