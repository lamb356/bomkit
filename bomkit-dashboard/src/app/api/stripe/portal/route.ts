import { NextResponse } from 'next/server';

import { AuthRequiredError } from '@/lib/auth';
import { ensureStripeCustomer, getStripe } from '@/lib/billing';

export async function POST() {
  try {
    const stripe = getStripe();
    const { customerId } = await ensureStripeCustomer();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to open billing portal' }, { status: 500 });
  }
}
