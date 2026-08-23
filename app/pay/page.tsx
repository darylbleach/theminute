import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PayPlans } from "@/components/pay-plans";

export const metadata: Metadata = {
  title: "Unlock this room",
  description:
    "Unlock a stand-up room for £19 once or £3/month. Saved roster and slot lengths. Stripe email owns the room.",
  robots: { index: false, follow: false },
};

export default function PayPage() {
  return (
    <PageShell kicker="Paid rooms" title="£19 once, or £3/month.">
      <PayPlans />
    </PageShell>
  );
}
