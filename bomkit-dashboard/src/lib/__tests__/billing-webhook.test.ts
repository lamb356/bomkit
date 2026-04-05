import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

const { setUserBillingState, tierFromPriceId } = vi.hoisted(() => ({
  setUserBillingState: vi.fn(),
  tierFromPriceId: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  setUserBillingState,
  tierFromPriceId,
}));

import { handleStripeWebhookEvent } from '../billing-webhook';

describe('handleStripeWebhookEvent', () => {
  it('maps checkout completion metadata to the expected billing state payload', async () => {
    await handleStripeWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_123',
          customer: 'cus_checkout',
          metadata: {
            tier: 'solo',
          },
        },
      },
    } as unknown as Stripe.Event);

    expect(tierFromPriceId).not.toHaveBeenCalled();
    expect(setUserBillingState).toHaveBeenCalledWith({
      userId: 'user_123',
      stripeCustomerId: 'cus_checkout',
      billingTier: 'solo',
    });
  });

  it('maps subscription updates to the derived tier and subscription id', async () => {
    vi.clearAllMocks();
    tierFromPriceId.mockReturnValue('pro');

    await handleStripeWebhookEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          items: {
            data: [{ price: { id: 'price_pro' } }],
          },
        },
      },
    } as unknown as Stripe.Event);

    expect(tierFromPriceId).toHaveBeenCalledWith('price_pro');
    expect(setUserBillingState).toHaveBeenCalledWith({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      billingTier: 'pro',
    });
  });

  it('clears stripeSubscriptionId when a subscription is deleted', async () => {
    vi.clearAllMocks();
    await handleStripeWebhookEvent({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_456',
          customer: 'cus_456',
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event);

    expect(setUserBillingState).toHaveBeenCalledWith({
      stripeCustomerId: 'cus_456',
      stripeSubscriptionId: null,
      billingTier: 'free',
    });
  });
});
