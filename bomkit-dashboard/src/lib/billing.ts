import fs from 'node:fs';
import path from 'node:path';

import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export type BillingTier = 'free' | 'solo' | 'pro';

function hydrateEnvFromLocalFile(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const eqIndex = line.indexOf('=');
    const key = line.slice(0, eqIndex);
    if (process.env[key]) continue;
    process.env[key] = line.slice(eqIndex + 1).trim();
  }
}

hydrateEnvFromLocalFile();

export function getStripe(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(stripeSecretKey);
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

  await db.update(users).set({
    billingTier: params.billingTier,
    stripeCustomerId: params.stripeCustomerId ?? targetUser.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId ?? targetUser.stripeSubscriptionId,
    updatedAt: new Date(),
  }).where(eq(users.id, targetUser.id));

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
