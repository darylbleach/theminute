import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

const links = [
  { href: "/buy", label: "Buy" },
  { href: "/queue", label: "Queue" },
  { href: "/archive", label: "Archive" },
  { href: "/longest", label: "Longest" },
  { href: "/terms", label: "Terms" },
];

export function SiteNav({ live }: { live?: boolean }) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 md:p-6">
      <Link
        href="/"
        className="pointer-events-auto font-display text-3xl leading-none tracking-wide text-acid md:text-4xl"
      >
        {SITE_NAME}
      </Link>
      <nav className="pointer-events-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/80">
        {live ? (
          <span className="flex items-center gap-2 text-hot">
            <span className="size-2 animate-pulse rounded-full bg-hot" />
            Live
          </span>
        ) : null}
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-acid">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
