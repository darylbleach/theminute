import { eq } from "drizzle-orm";
import { getDb, reigns, siteState } from "@/db";
import {
  contactEmail,
  FIRST_REIGN_MINUTES,
  FIRST_REIGN_TAGLINE,
  FIRST_REIGN_URL,
} from "@/lib/config";
import { minutesCostCents } from "@/lib/money";
import { parsePlacementUrl } from "@/lib/urls";

async function seed() {
  const db = getDb();
  const now = new Date();
  const placement = parsePlacementUrl(FIRST_REIGN_URL);
  const minutes = Math.max(60, FIRST_REIGN_MINUTES);
  const endsAt = new Date(now.getTime() + minutes * 60_000);

  await db
    .insert(siteState)
    .values({ id: 1, killed: false, totalGrossCents: 0 })
    .onConflictDoNothing();

  const [existingLive] = await db
    .select({ id: reigns.id })
    .from(reigns)
    .where(eq(reigns.status, "live"))
    .limit(1);

  if (existingLive) {
    console.log("Live reign already exists, skipping seed.");
    return;
  }

  await db.insert(reigns).values({
    id: crypto.randomUUID(),
    url: placement.href,
    hostname: placement.hostname,
    tagline: FIRST_REIGN_TAGLINE,
    logoUrl: null,
    buyerEmail: contactEmail(),
    minutesPaid: minutes,
    startedAt: now,
    endsAt,
    status: "live",
    dollarsPaidCents: minutesCostCents(minutes),
    isSeeded: true,
  });

  console.log(`Seeded first reign: ${placement.hostname} for ${minutes} minutes.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
