import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getStripe } from '@/lib/billing';
import { handleStripeWebhookEvent } from '@/lib/billing-webhook';
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

  await handleStripeWebhookEvent(event);

  return NextResponse.json({ received: true, type: event.type });
}
