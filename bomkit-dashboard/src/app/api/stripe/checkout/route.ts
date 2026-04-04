import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { ensureStripeCustomer, getPriceIdForTier, getStripe, type BillingTier } from '@/lib/billing';
import { getAppBaseUrl } from '@/lib/env';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedTier = (body.tier || 'solo') as BillingTier;
    if (!['solo', 'pro'].includes(requestedTier)) {
      return NextResponse.json({ error: 'tier must be solo or pro' }, { status: 400 });
    }

    const priceId = getPriceIdForTier(requestedTier);
    if (!priceId) {
      return NextResponse.json({ error: `No Stripe price configured for ${requestedTier}` }, { status: 500 });
    }

    const stripe = getStripe();
    const { user, customerId } = await ensureStripeCustomer();
    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      metadata: { userId: user.id, tier: requestedTier },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Checkout failed' }, { status: 500 });
  }
}
