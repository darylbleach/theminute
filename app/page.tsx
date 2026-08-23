import { CreateRoom } from "@/components/create-room";
import { SiteNav } from "@/components/site-nav";

export default function HomePage() {
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
        <CreateRoom />
        <footer className="mt-16 flex flex-col gap-3 border-t border-paper/15 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>Free for one room · no account required</span>
          <a
            href="mailto:hello@theminute.lol?subject=The%20Minute%20for%20teams"
            className="hover:text-acid"
          >
            Saved teams + Slack coming soon · £19 once or £3/mo
          </a>
        </footer>
      </section>
    </main>
  );
}
