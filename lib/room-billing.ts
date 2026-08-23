import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { rooms, type DbTransaction } from "@/db";
import { ROOM_MONTHLY_CENTS, ROOM_ONCE_CENTS } from "@/lib/config";
import { applyFreeLimits } from "@/lib/rooms";
import { getStripe } from "@/lib/stripe";

const LIVE_ROOM_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export const ROOM_CHECKOUT_KIND = "standup_room";
export const ROOM_CHECKOUT_PRODUCT = "room";

export type RoomPlan = "once" | "monthly";

export function isRoomPlan(value: unknown): value is RoomPlan {
  return value === "once" || value === "monthly";
}

export function isPaidRoomMetadata(
  metadata: Stripe.Metadata | null | undefined,
) {
  if (!metadata) return false;
  return (
    metadata.kind === ROOM_CHECKOUT_KIND ||
    metadata.product === ROOM_CHECKOUT_PRODUCT
  );
}

export function roomCheckoutMetadata(roomCode: string, plan: RoomPlan) {
  return {
    kind: ROOM_CHECKOUT_KIND,
    product: ROOM_CHECKOUT_PRODUCT,
    roomCode,
    plan,
  };
}

export function roomPlanPrice(plan: RoomPlan) {
  return {
    currency: "gbp" as const,
    unitAmount: plan === "once" ? ROOM_ONCE_CENTS : ROOM_MONTHLY_CENTS,
    name:
      plan === "once"
        ? "The Minute — saved stand-up room"
        : "The Minute — stand-up room",
    description:
      plan === "once"
        ? "One-time unlock: saved roster and slot lengths."
        : "Monthly unlock: saved roster and slot lengths. Cancel any time.",
  };
}

export function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  return stripeId(invoice.parent?.subscription_details?.subscription);
}

export function isLiveRoomSubscriptionStatus(
  status: string | null | undefined,
) {
  return Boolean(status && LIVE_ROOM_SUBSCRIPTION_STATUSES.has(status));
}

export function shouldMarkRoomPaidFromCheckout(
  eventType: string,
  paymentStatus: string | null | undefined,
) {
  if (eventType === "checkout.session.async_payment_succeeded") return true;
  return eventType === "checkout.session.completed" && paymentStatus === "paid";
}

export function subscriptionStatusFromInvoice(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription || typeof subscription === "string") return null;
  return subscription.status ?? null;
}

export function shouldMarkRoomPaidFromInvoice(input: {
  storedSubscriptionId: string | null | undefined;
  invoiceSubscriptionId: string | null | undefined;
  subscriptionStatus: string | null | undefined;
}) {
  const stored = input.storedSubscriptionId ?? null;
  const invoiceSubscriptionId = input.invoiceSubscriptionId ?? null;
  if (stored && invoiceSubscriptionId && stored === invoiceSubscriptionId) {
    return true;
  }
  return isLiveRoomSubscriptionStatus(input.subscriptionStatus);
}

export function needsSubscriptionStatusForInvoicePaid(input: {
  storedSubscriptionId: string | null | undefined;
  invoiceSubscriptionId: string | null | undefined;
  subscriptionStatus: string | null | undefined;
}) {
  if (shouldMarkRoomPaidFromInvoice(input)) return false;
  if (input.subscriptionStatus) return false;
  return Boolean(input.invoiceSubscriptionId);
}

function checkoutEmail(session: Stripe.Checkout.Session) {
  const email =
    session.metadata?.email ||
    session.customer_details?.email ||
    session.customer_email;
  return email ? email.trim().toLowerCase() : null;
}

export async function markRoomPaidFromCheckout(
  tx: DbTransaction,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== "paid") return;

  const metadata = session.metadata ?? {};
  const roomCode = metadata.roomCode;
  if (!roomCode) {
    console.error("room checkout session is missing roomCode", session.id);
    return;
  }

  await tx
    .update(rooms)
    .set({
      paid: true,
      paidEmail: checkoutEmail(session),
      stripeCustomerId: stripeId(session.customer),
      stripeSubscriptionId: stripeId(session.subscription),
      stripeSessionId: session.id,
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, roomCode));
}

export async function markRoomPaidFromInvoice(
  tx: DbTransaction,
  invoice: Stripe.Invoice,
) {
  const metadata = invoice.parent?.subscription_details?.metadata ?? {};
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!isPaidRoomMetadata(metadata) && !subscriptionId) return;

  const room =
    (subscriptionId
      ? await tx.query.rooms.findFirst({
          where: eq(rooms.stripeSubscriptionId, subscriptionId),
        })
      : null) ??
    (metadata.roomCode
      ? await tx.query.rooms.findFirst({
          where: eq(rooms.code, metadata.roomCode),
        })
      : null);

  if (!room) return;

  let subscriptionStatus = subscriptionStatusFromInvoice(invoice);
  const invoiceGuard = {
    storedSubscriptionId: room.stripeSubscriptionId,
    invoiceSubscriptionId: subscriptionId,
    subscriptionStatus,
  };
  if (needsSubscriptionStatusForInvoicePaid(invoiceGuard) && subscriptionId) {
    const subscription = await getStripe().subscriptions.retrieve(
      subscriptionId,
    );
    subscriptionStatus = subscription.status;
  }
  if (
    !shouldMarkRoomPaidFromInvoice({
      storedSubscriptionId: room.stripeSubscriptionId,
      invoiceSubscriptionId: subscriptionId,
      subscriptionStatus,
    })
  ) {
    return;
  }

  const email = invoice.customer_email?.trim().toLowerCase() || room.paidEmail;

  await tx
    .update(rooms)
    .set({
      paid: true,
      paidEmail: email,
      stripeCustomerId: stripeId(invoice.customer) ?? room.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? room.stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(rooms.code, room.code));
}

export async function markRoomUnpaidFromSubscription(
  tx: DbTransaction,
  subscription: Stripe.Subscription,
) {
  const metadata = subscription.metadata ?? {};
  const room =
    (await tx.query.rooms.findFirst({
      where: eq(rooms.stripeSubscriptionId, subscription.id),
    })) ??
    (metadata.roomCode
      ? await tx.query.rooms.findFirst({
          where: eq(rooms.code, metadata.roomCode),
        })
      : null);

  if (!room) return;
  // One-time £19 rooms have no subscription. Leave them paid.
  if (!room.stripeSubscriptionId) return;
  if (room.stripeSubscriptionId !== subscription.id) return;

  await tx
    .update(rooms)
    .set(applyFreeLimits(room))
    .where(eq(rooms.code, room.code));
}
