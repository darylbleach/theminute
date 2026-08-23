import { cookies } from "next/headers";
import { siteUrl } from "@/lib/config";
import {
  isRoomPlan,
  roomCheckoutMetadata,
  roomPlanPrice,
} from "@/lib/room-billing";
import { findHostRoom, hashToken, HOST_COOKIE } from "@/lib/rooms";
import {
  getStripe,
  integrationIdentifier,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const plan = (json as { plan?: unknown }).plan;
  if (!isRoomPlan(plan)) {
    return Response.json(
      { error: "Pick £19 once or £3/month." },
      { status: 400 },
    );
  }

  const token = (await cookies()).get(HOST_COOKIE)?.value;
  if (!token) {
    return Response.json(
      { error: "Create a stand-up room first, then unlock it from this browser." },
      { status: 403 },
    );
  }

  let room;
  try {
    room = await findHostRoom(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("DATABASE_URL")) {
      return Response.json({ error: "Database is not configured yet." }, { status: 503 });
    }
    throw error;
  }

  if (!room || hashToken(token) !== room.hostTokenHash) {
    return Response.json(
      { error: "Only the host of this room can start checkout." },
      { status: 403 },
    );
  }

  if (room.paid) {
    return Response.json(
      { error: "This room is already unlocked.", code: room.code },
      { status: 409 },
    );
  }

  const metadata = roomCheckoutMetadata(room.code, plan);
  const price = roomPlanPrice(plan);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: plan === "once" ? "payment" : "subscription",
      success_url: `${siteUrl()}/r/${room.code}?checkout=success`,
      cancel_url: `${siteUrl()}/pay`,
      client_reference_id: room.code,
      managed_payments: { enabled: false },
      metadata,
      ...(plan === "once"
        ? { customer_creation: "always" as const }
        : { subscription_data: { metadata } }),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: price.currency,
            unit_amount: price.unitAmount,
            product_data: {
              name: price.name,
              description: price.description,
            },
            ...(plan === "monthly"
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
        },
      ],
      integration_identifier: integrationIdentifier("room"),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return Response.json({ url: session.url, code: room.code });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return Response.json(
        { error: "Stripe is not configured yet." },
        { status: 503 },
      );
    }
    console.error("room checkout failed", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
