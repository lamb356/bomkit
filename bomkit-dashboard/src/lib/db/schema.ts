import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 191 }).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  billingTier: varchar('billing_tier', { length: 32 }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('projects_user_id_idx').on(table.userId),
}));

export const bomRevisions = pgTable('bom_revisions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
  sourceFormat: varchar('source_format', { length: 32 }).notNull(),
  sourceFilename: text('source_filename').notNull(),
  notes: text('notes'),
}, (table) => ({
  projectIdx: index('bom_revisions_project_id_idx').on(table.projectId),
  projectVersionUnique: uniqueIndex('bom_revisions_project_version_uidx').on(table.projectId, table.version),
}));

export const bomRows = pgTable('bom_rows', {
  id: serial('id').primaryKey(),
  revisionId: integer('revision_id').notNull().references(() => bomRevisions.id, { onDelete: 'cascade' }),
  designators: jsonb('designators').$type<string[]>().notNull(),
  quantity: integer('quantity').notNull(),
  value: text('value').notNull(),
  footprint: text('footprint').notNull(),
  mpn: text('mpn'),
  manufacturer: text('manufacturer'),
  lcscPart: text('lcsc_part'),
  status: varchar('status', { length: 32 }).notNull(),
  jlcTier: varchar('jlc_tier', { length: 32 }).notNull(),
  jlcLoadingFee: numeric('jlc_loading_fee', { precision: 10, scale: 2 }).default('0').notNull(),
  userNotes: text('user_notes'),
  lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true }),
}, (table) => ({
  revisionIdx: index('bom_rows_revision_id_idx').on(table.revisionId),
  lcscIdx: index('bom_rows_lcsc_part_idx').on(table.lcscPart),
}));

export const lockedChoices = pgTable('locked_choices', {
  id: serial('id').primaryKey(),
  rowId: integer('row_id').notNull().references(() => bomRows.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  sku: text('sku'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }),
  currency: varchar('currency', { length: 8 }).notNull().default('USD'),
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
}, (table) => ({
  rowUnique: uniqueIndex('locked_choices_row_id_uidx').on(table.rowId),
}));

export const localOffers = pgTable('local_offers', {
  id: serial('id').primaryKey(),
  rowId: integer('row_id').notNull().references(() => bomRows.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 8 }).notNull().default('USD'),
  moq: integer('moq'),
  leadTimeDays: integer('lead_time_days'),
  enteredAt: timestamp('entered_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
}, (table) => ({
  rowIdx: index('local_offers_row_id_idx').on(table.rowId),
}));

export const jlcPartsCache = pgTable('jlc_parts_cache', {
  id: serial('id').primaryKey(),
  lcscPart: text('lcsc_part').notNull(),
  classification: varchar('classification', { length: 32 }).notNull(),
  preferred: boolean('preferred').notNull().default(false),
  description: text('description'),
  source: text('source').notNull().default('lrks/jlcpcb-economic-parts'),
  refreshedAt: timestamp('refreshed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  lcscUnique: uniqueIndex('jlc_parts_cache_lcsc_uidx').on(table.lcscPart),
}));
