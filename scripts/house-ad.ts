import { reigns } from "@/db";
import {
  contactEmail,
  FIRST_REIGN_TAGLINE,
  FIRST_REIGN_URL,
} from "@/lib/config";
import {
  advanceClock,
  getLiveReign,
  getQueuedReigns,
  withQueueLock,
} from "@/lib/queue";
import {
  parsePlacementUrl,
  sanitizeLogoUrl,
  sanitizeTagline,
} from "@/lib/urls";

/**
 * Puts a house ad on the homepage so the page is never dead between buyers.
 *
 * A house ad is not a sale and must never look like one in the numbers: it
 * records zero revenue, never touches the site's gross total, is flagged as a
 * seed so the archive and homepage can label it, and is archived the moment a
 * paying reign is waiting. Only advertise a site you own or have permission to
 * run.
 */
const MAX_MINUTES = 60;
const DEFAULT_MINUTES = 25;

function arg(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

async function houseAd() {
  const minutes = Number(arg("minutes") ?? DEFAULT_MINUTES);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
    throw new Error(
      `--minutes must be a whole number from 1 to ${MAX_MINUTES}.`,
    );
  }

  const placement = parsePlacementUrl(arg("url") ?? FIRST_REIGN_URL);
  const tagline = sanitizeTagline(arg("tagline") ?? FIRST_REIGN_TAGLINE);
  const logoUrl = sanitizeLogoUrl(arg("logo") ?? null);

  const result = await withQueueLock(async (tx) => {
    await advanceClock(tx);

    const live = await getLiveReign(tx);
    if (live) {
      return {
        placed: false,
        reason: `${live.hostname} is already on the clock.`,
      };
    }

    const [waiting] = await getQueuedReigns(tx);
    if (waiting) {
      return {
        placed: false,
        reason: `${waiting.hostname} has paid and is waiting, so the page is theirs.`,
      };
    }

    const now = new Date();
    await tx.insert(reigns).values({
      id: crypto.randomUUID(),
      url: placement.href,
      hostname: placement.hostname,
      tagline,
      logoUrl,
      buyerEmail: contactEmail(),
      minutesPaid: minutes,
      startedAt: now,
      endsAt: new Date(now.getTime() + minutes * 60_000),
      status: "live",
      dollarsPaidCents: 0,
      isSeeded: true,
    });

    return { placed: true, reason: null };
  });

  if (!result.placed) {
    console.log(`No house ad placed: ${result.reason}`);
    return;
  }

  console.log(
    `House ad live: ${placement.hostname} for ${minutes} minutes, $0 recorded.`,
  );
  console.log("It yields the page as soon as somebody pays.");
}

houseAd().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
