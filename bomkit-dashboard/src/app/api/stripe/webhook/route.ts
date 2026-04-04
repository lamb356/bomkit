import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getStripe, setUserBillingState, tierFromPriceId } from '@/lib/billing';
import { requireEnv } from '@/lib/env';

export async function POST(request: Request) {
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(payload, signature, requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook verification failed' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tier = session.metadata?.tier === 'pro' ? 'pro' : session.metadata?.tier === 'solo' ? 'solo' : 'free';
    await setUserBillingState({
      userId: session.client_reference_id,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      billingTier: tier,
    });
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const priceId = subscription.items.data[0]?.price.id;
    await setUserBillingState({
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      billingTier: tierFromPriceId(priceId),
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await setUserBillingState({
      stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: null,
      billingTier: 'free',
    });
  }

  return NextResponse.json({ received: true, type: event.type });
}
