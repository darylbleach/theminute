import { contactEmail } from "@/lib/config";
import { PageShell } from "@/components/page-shell";

export default function TermsPage() {
  return (
    <PageShell kicker="Legal" title="Paid placement. Not a contest.">
      <div className="flex max-w-3xl flex-col gap-6 text-paper/80">
        <p>
          The Minute sells advertising time on a public webpage. You are buying
          a placement: your URL, logo, and one line of copy on the homepage for
          a number of minutes. This is not a contest, lottery, sweepstakes, or
          prize draw. There is no chance element and nothing of value is awarded
          to a winner.
        </p>
        <p>
          <strong className="text-paper">No refunds.</strong> Minutes already
          paid for cannot be taken by another buyer. If you are still in the
          queue, another buyer can pay to go in front of you. That payment does
          not delete your minutes.
        </p>
        <p>
          Cutting the line costs 2× the remaining minutes of everyone skipped.
          80% of that premium is issued as <strong className="text-paper">site credit</strong>{" "}
          to the skipped buyers. Credits are not cash, are not transferable
          off-site, and can only be applied to future Minute purchases. 20% is
          retained by the house.
        </p>
        <p>
          All paid outbound links are marked <code>nofollow sponsored</code>. We
          may refuse, delay, or take down a placement that is illegal, deceptive,
          malware, adult, hateful, or otherwise unfit for a full-page takeover.
          Report a URL: {contactEmail()}.
        </p>
        <p>
          Payments are processed by Stripe. We store the email Stripe collects,
          the placement you bought, click counts, and the credit ledger. We do
          not create user accounts in v1.
        </p>
      </div>
    </PageShell>
  );
}
