import type { Metadata } from "next";
import { contactEmail } from "@/lib/config";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for The Minute, a UK stand-up timer. Free for 60 seconds and six people, or unlock a room for £19 once or £3/month.",
};

export default function TermsPage() {
  return (
    <PageShell kicker="Legal" title="A stand-up timer.">
      <div className="flex max-w-3xl flex-col gap-6 text-paper/80">
        <p>
          The Minute is a shared stand-up timer. You create a room, share the
          link, and each person gets a timed slot before the clock moves on. It
          is not an auction, contest, lottery, or advertising placement.
        </p>
        <p>
          <strong className="text-paper">Free rooms</strong> are 60-second slots
          and up to six people. No account is required.
        </p>
        <p>
          <strong className="text-paper">Unlock a room</strong> for £19 once, or
          £3/month. Paid hosts keep a saved roster and can pick slot length.
          Cancel a monthly plan at any time; the room then returns to the free
          limits. Prices are in pounds sterling.
        </p>
        <p>
          Payments are processed by Stripe. Stripe collects your email at
          checkout; that email owns an unlocked room. You can open it from any
          computer with a one-time link or six-digit code. No password. Joiners
          use the share link with no login. Free rooms stay on the creating
          browser. We store the room, the roster, and whether it is unlocked. We
          do not create user accounts.
        </p>
        <p>
          <strong className="text-paper">No refunds</strong> on the one-time £19
          unlock once the room is paid. Monthly billing can be cancelled; we do
          not refund a month already started.
        </p>
        <p>
          These terms are governed by the laws of England and Wales. Questions:{" "}
          {contactEmail()}.
        </p>
      </div>
    </PageShell>
  );
}
