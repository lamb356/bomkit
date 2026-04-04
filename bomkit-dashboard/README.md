# BOMKit Dashboard

BOMKit Dashboard is the web companion to BOMKit Fab: a persistent BOM workspace for KiCad users with JLC assembly-cost intelligence.

Core MVP scope:
- import BOMKit Fab export CSVs and KiCad Symbol Fields CSVs
- persist projects, revisions, row edits, notes, local offers, and locked choices
- preserve sourcing decisions across revisions
- show JLC Basic / Preferred Extended / Extended classification and loading-fee impact
- export a cleaned dashboard CSV or JLC-ready CSV on paid tiers

## Positioning

BOMKit Dashboard is not a multi-distributor pricing engine. It is a saved BOM workspace with memory:
- Octopart BOM tools are fast, but temporary
- PartsBox is powerful, but more expensive
- BOMKit Dashboard focuses on the middle: saved cleanup decisions and JLC manufacturing intelligence for KiCad users

## Stack

- Next.js App Router
- TypeScript
- Drizzle ORM
- Neon PostgreSQL
- NextAuth (GitHub)
- Stripe billing
- TanStack Table

## Environment

Copy `.env.local.example` to `.env.local` and set:
- `DATABASE_URL`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_SOLO_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY`

Optional demo fallbacks:
- `DEMO_USER_ID`
- `DEMO_USER_EMAIL`
- `DEMO_USER_NAME`

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm test
npm run build
npx drizzle-kit generate
npx drizzle-kit push --force
```

## Current billing setup

Stripe products created:
- BOMKit Dashboard Solo — $15/month
- BOMKit Dashboard Pro — $29/month

Implemented routes:
- `POST /api/stripe/checkout`
- `POST /api/stripe/portal`
- `POST /api/stripe/webhook`

## Relationship to BOMKit Fab

BOMKit Fab is the manufacturing-handoff wedge inside KiCad.
BOMKit Dashboard is the persistent workspace after export:
- import the generated BOM
- clean and annotate rows once
- keep sourcing decisions across revisions
- see JLC fee impact before ordering

## Deployment status

Local build and tests pass.
A Windows-native Vercel deploy was delegated to Claude Code, but the current Vercel token is invalid/expired and needs re-authentication before production deployment can complete.
