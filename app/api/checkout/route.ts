import { z } from "zod";
import { contactEmail, MAX_MINUTES, MIN_MINUTES, siteUrl } from "@/lib/config";
import { applyCredits, minutesCostCents } from "@/lib/money";
import {
  creditBalanceCents,
  getLiveReign,
  getQueuedReigns,
  quoteCut,
  withQueueLock,
} from "@/lib/queue";
import { getStripe, integrationIdentifier } from "@/lib/stripe";
import { faviconFor, parsePlacementUrl, sanitizeTagline } from "@/lib/urls";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().min(1),
  tagline: z.string().min(1),
  email: z.string().email(),
  minutes: z.coerce.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
  action: z.enum(["buy", "cut", "defend"]),
  logoUrl: z.string().url().optional().nullable(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  let placement;
  let tagline;
  try {
    placement = parsePlacementUrl(parsed.data.url);
    tagline = sanitizeTagline(parsed.data.tagline);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid placement." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const minutes = parsed.data.minutes;
  const action = parsed.data.action;
  const logoUrl = parsed.data.logoUrl || faviconFor(placement.hostname);

  try {
    const quote = await withQueueLock(async (tx) => {
      const live = await getLiveReign(tx);
      if (action === "defend") {
        if (!live || live.buyerEmail.toLowerCase() !== email) {
          throw new Error("Only the current holder can add minutes.");
        }
      }

      const queued = await getQueuedReigns(tx);
      if (action === "cut" && queued.length === 0) {
        throw new Error("Nobody is in line. Buy the next minutes instead.");
      }

      const cut = action === "cut" ? quoteCut(queued) : null;
      const expectedCents = minutesCostCents(minutes) + (cut?.premiumCents ?? 0);
      const balance = await creditBalanceCents(tx, email);
      const { creditApplied, chargedCents } = applyCredits(expectedCents, balance);

      return {
        live,
        queued,
        cut,
        expectedCents,
        creditApplied,
        chargedCents,
      };
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${siteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/buy`,
      client_reference_id: email,
      metadata: {
        action,
        url: placement.href,
        hostname: placement.hostname,
        tagline,
        logoUrl,
        minutes: String(minutes),
        email,
        creditAppliedCents: String(quote.creditApplied),
        quotedPremiumCents: String(quote.cut?.premiumCents ?? 0),
        quotedSkipIds: quote.queued.map((item) => item.id).join(","),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: quote.chargedCents,
            product_data: {
              name:
                action === "defend"
                  ? `Defend The Minute — ${minutes} extra minute${minutes === 1 ? "" : "s"}`
                  : action === "cut"
                    ? `Cut the line — ${minutes} minute${minutes === 1 ? "" : "s"}`
                    : `The Minute — ${minutes} minute${minutes === 1 ? "" : "s"}`,
              description: `${placement.hostname} · ${tagline}`,
            },
          },
        },
      ],
      integration_identifier: integrationIdentifier(action),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return Response.json({
      url: session.url,
      chargedCents: quote.chargedCents,
      creditApplied: quote.creditApplied,
      cutPremiumCents: quote.cut?.premiumCents ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return Response.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({
    contactEmail: contactEmail(),
    minMinutes: MIN_MINUTES,
    maxMinutes: MAX_MINUTES,
  });
}
