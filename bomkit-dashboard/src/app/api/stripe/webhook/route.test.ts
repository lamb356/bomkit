import { beforeEach, describe, expect, it, vi } from 'vitest';

const { constructEvent, handleStripeWebhookEvent } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  handleStripeWebhookEvent: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent,
    },
  }),
}));

vi.mock('@/lib/billing-webhook', () => ({
  handleStripeWebhookEvent,
}));

vi.mock('@/lib/env', () => ({
  requireEnv: vi.fn(() => 'whsec_test'),
}));

import { POST } from './route';

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the raw request body before dispatching the event', async () => {
    const event = { type: 'checkout.session.completed' };
    constructEvent.mockReturnValue(event);

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: '{"raw":"payload"}',
    });

    const response = await POST(request);

    expect(constructEvent).toHaveBeenCalledWith('{"raw":"payload"}', 'sig_test', 'whsec_test');
    expect(handleStripeWebhookEvent).toHaveBeenCalledWith(event);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, type: 'checkout.session.completed' });
  });

  it('rejects requests missing the Stripe signature header', async () => {
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing stripe-signature' });
    expect(constructEvent).not.toHaveBeenCalled();
    expect(handleStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('returns a non-200 response when webhook handling fails after verification', async () => {
    const event = { type: 'customer.subscription.updated' };
    constructEvent.mockReturnValue(event);
    handleStripeWebhookEvent.mockRejectedValue(new Error('user not found for webhook update'));

    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: '{"raw":"payload"}',
    });

    await expect(POST(request)).rejects.toThrow('user not found for webhook update');
  });
});
