import Stripe from "stripe";
import { stripeEvents } from "@/db";
import {
  isPaidRoomMetadata,
  markRoomPaidFromCheckout,
  markRoomPaidFromInvoice,
  markRoomUnpaidFromSubscription,
  shouldMarkRoomPaidFromCheckout,
} from "@/lib/room-billing";
import { fulfillCheckout, withQueueLock } from "@/lib/queue";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

function auctionFulfillment(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const email =
    metadata.email ||
    session.customer_details?.email ||
    session.customer_email;
  if (!email) {
    throw new Error("Checkout session is missing an email.");
  }

  const minutes = Number(metadata.minutes);
  const action = metadata.action;
  if (!metadata.url || !metadata.hostname || !metadata.tagline) {
    throw new Error("Checkout session is missing placement metadata.");
  }
  if (!Number.isInteger(minutes) || minutes < 1) {
    throw new Error("Checkout session has an invalid minute count.");
  }
  if (action !== "buy" && action !== "cut" && action !== "defend") {
    throw new Error("Checkout session has an invalid action.");
  }

  return {
    sessionId: session.id,
    paymentIntentId: paymentIntentId(session),
    email,
    url: metadata.url,
    hostname: metadata.hostname,
    tagline: metadata.tagline,
    logoUrl: metadata.logoUrl || null,
    minutes,
    action,
    dollarsPaidCents: session.amount_total ?? 0,
    creditAppliedCents: Number(metadata.creditAppliedCents ?? 0),
    quotedPremiumCents: Number(metadata.quotedPremiumCents ?? 0),
    quotedSkipIds: (metadata.quotedSkipIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  } as const;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json({ error: "Missing webhook secret." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await withQueueLock(async (tx) => {
      const inserted = await tx
        .insert(stripeEvents)
        .values({ id: event.id, type: event.type })
        .onConflictDoNothing()
        .returning({ id: stripeEvents.id });
      if (inserted.length === 0) return;

      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        if (isPaidRoomMetadata(session.metadata)) {
          if (
            shouldMarkRoomPaidFromCheckout(event.type, session.payment_status)
          ) {
            await markRoomPaidFromCheckout(tx, session);
          }
          return;
        }
        await fulfillCheckout(tx, auctionFulfillment(session));
        return;
      }

      if (event.type === "invoice.paid") {
        await markRoomPaidFromInvoice(
          tx,
          event.data.object as Stripe.Invoice,
        );
        return;
      }

      if (event.type === "customer.subscription.deleted") {
        await markRoomUnpaidFromSubscription(
          tx,
          event.data.object as Stripe.Subscription,
        );
      }
    });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
