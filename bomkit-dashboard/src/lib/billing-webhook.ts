import Stripe from 'stripe';

import { setUserBillingState, tierFromPriceId } from '@/lib/billing';

async function requireBillingStateUpdate(
  eventType: string,
  params: Parameters<typeof setUserBillingState>[0],
): Promise<void> {
  const updatedUserId = await setUserBillingState(params);
  if (updatedUserId) return;

  const details = JSON.stringify(params);
  const message = `Stripe webhook ${eventType} could not match a user for billing state update: ${details}`;
  console.error(message);
  throw new Error(message);
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tier = session.metadata?.tier === 'pro' ? 'pro' : session.metadata?.tier === 'solo' ? 'solo' : 'free';
    await requireBillingStateUpdate(event.type, {
      userId: session.client_reference_id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      billingTier: tier,
    });
    return;
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const priceId = subscription.items.data[0]?.price.id;
    await requireBillingStateUpdate(event.type, {
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      billingTier: tierFromPriceId(priceId),
    });
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await setUserBillingState({
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: null,
      billingTier: 'free',
    });
  }
}
