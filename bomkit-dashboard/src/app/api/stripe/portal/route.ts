import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { ensureStripeCustomer, getStripe } from '@/lib/billing';
import { getAppUrl } from '@/lib/env';

export async function POST() {
  try {
    const stripe = getStripe();
    const { customerId } = await ensureStripeCustomer();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getAppUrl('/dashboard'),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to open billing portal' }, { status: 500 });
  }
}
