import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { ensureEnvLoaded, requireEnv } from '@/lib/env';

export type BillingTier = 'free' | 'solo' | 'pro';

ensureEnvLoaded();

export function getStripe(): Stripe {
  return new Stripe(requireEnv('STRIPE_SECRET_KEY'));
}

export function getPriceIdForTier(tier: BillingTier): string | null {
  if (tier === 'solo') return process.env.STRIPE_SOLO_PRICE_ID ?? null;
  if (tier === 'pro') return process.env.STRIPE_PRO_PRICE_ID ?? null;
  return null;
}

export function tierFromPriceId(priceId: string | null | undefined): BillingTier {
  if (!priceId) return 'free';
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo';
  return 'free';
}

export async function ensureCurrentUserRecord() {
  const currentUser = await requireCurrentUser();
  const email = currentUser.email || `${currentUser.id}@local.demo`;
  const existing = await db.query.users.findFirst({ where: eq(users.id, currentUser.id) });

  if (existing) {
    if (existing.email !== email || existing.name !== currentUser.name || existing.image !== currentUser.image) {
      await db.update(users).set({
        email,
        name: currentUser.name,
        image: currentUser.image,
        updatedAt: new Date(),
      }).where(eq(users.id, currentUser.id));
    }
    return { ...existing, email, name: currentUser.name, image: currentUser.image };
  }

  const [created] = await db.insert(users).values({
    id: currentUser.id,
    email,
    name: currentUser.name,
    image: currentUser.image,
    billingTier: 'free',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return created;
}

export async function getCurrentBillingState() {
  const user = await ensureCurrentUserRecord();
  return {
    user,
    tier: (user.billingTier as BillingTier) || 'free',
  };
}

export async function ensureStripeCustomer() {
  const { user } = await getCurrentBillingState();
  if (user.stripeCustomerId) return { user, customerId: user.stripeCustomerId };

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await db.update(users).set({
    stripeCustomerId: customer.id,
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));

  return {
    user: { ...user, stripeCustomerId: customer.id },
    customerId: customer.id,
  };
}

export async function setUserBillingState(params: {
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  billingTier: BillingTier;
}) {
  let targetUser = params.userId ? await db.query.users.findFirst({ where: eq(users.id, params.userId) }) : null;

  if (!targetUser && params.stripeCustomerId) {
    targetUser = await db.query.users.findFirst({ where: eq(users.stripeCustomerId, params.stripeCustomerId) });
  }

  if (!targetUser) return null;

  const update: Partial<typeof users.$inferInsert> = {
    billingTier: params.billingTier,
    updatedAt: new Date(),
  };

  if ('stripeCustomerId' in params) {
    update.stripeCustomerId = params.stripeCustomerId ?? null;
  }

  if ('stripeSubscriptionId' in params) {
    update.stripeSubscriptionId = params.stripeSubscriptionId ?? null;
  }

  await db.update(users).set(update).where(eq(users.id, targetUser.id));

  return targetUser.id;
}

export function projectLimitForTier(tier: BillingTier): number | null {
  if (tier === 'free') return 1;
  return null;
}

export function rowLimitForTier(tier: BillingTier): number | null {
  if (tier === 'free') return 50;
  return null;
}

export function canExportForTier(tier: BillingTier): boolean {
  return tier !== 'free';
}
