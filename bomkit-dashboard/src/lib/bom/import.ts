import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { classifyJlcPart } from '@/lib/jlc/classifier';
import { db } from '@/lib/db/client';
import { bomRevisions, bomRows, jlcPartsCache, localOffers, lockedChoices, projects } from '@/lib/db/schema';
import { detectFormat, parseBomkitCsv, parseKicadCsv, type ParsedBOMRow } from '@/lib/parsers';

import { carryForwardLockedChoices } from './carry-forward';
import { diffRows, type DiffableRow } from './diff';

const PROJECT_CREATION_LOCK_NAMESPACE = 1_001;
const PROJECT_IMPORT_LOCK_NAMESPACE = 1_002;

function normalizeStatus(row: ParsedBOMRow): 'resolved' | 'unresolved' | 'dnp' {
  if ((row.value || '').toUpperCase() === 'DNP') return 'dnp';
  return row.lcscPart ? 'resolved' : 'unresolved';
}

export async function parseInputCsv(input: string): Promise<ParsedBOMRow[]> {
  const format = detectFormat(input);
  return format === 'bomkit-fab' ? parseBomkitCsv(input) : parseKicadCsv(input);
}

type LockInsert = typeof lockedChoices.$inferInsert;
type SnapshotRow = typeof bomRows.$inferSelect & {
  offers: Array<typeof localOffers.$inferSelect>;
  lockedChoice: typeof lockedChoices.$inferSelect | null;
};

interface HistoricalRow extends DiffableRow {
  rowId?: number;
  lockedChoice?: typeof lockedChoices.$inferSelect | null;
}

export class ProjectLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectLimitError';
  }
}

export class RowLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RowLimitError';
  }
}

type DbClient = Pick<typeof db, 'execute' | 'insert' | 'query' | 'select' | 'transaction' | 'update'>;

async function loadClassifications(executor: DbClient = db) {
  const cachedParts = await executor.select().from(jlcPartsCache);
  return new Map(cachedParts.map((row) => [row.lcscPart, {
    lcscPart: row.lcscPart,
    classification: row.classification as 'basic' | 'preferred_extended' | 'extended' | 'not_found' | 'unknown',
    preferred: row.preferred,
    description: row.description,
  }]));
}

export async function getOwnedProject(userId: string, projectId: number) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  });
}

async function createProjectForUserWithExecutor(params: {
  userId: string;
  projectName: string;
  maxProjects?: number | null;
}, executor: DbClient) {
  await executor.execute(sql`select pg_advisory_xact_lock(${PROJECT_CREATION_LOCK_NAMESPACE}, hashtext(${params.userId}))`);

  if (params.maxProjects != null) {
    const existing = await executor.select({ id: projects.id }).from(projects).where(eq(projects.userId, params.userId));
    if (existing.length >= params.maxProjects) {
      throw new ProjectLimitError(`Free tier is limited to ${params.maxProjects} project. Upgrade to Solo for unlimited projects.`);
    }
  }

  const inserted = await executor.insert(projects).values({
    userId: params.userId,
    name: params.projectName,
  }).returning();

  return inserted[0]!;
}

export async function createProjectForUser(params: {
  userId: string;
  projectName: string;
  maxProjects?: number | null;
}) {
  return db.transaction(async (tx) => createProjectForUserWithExecutor(params, tx));
}

async function loadHistoricalRows(revisionId: number, executor: DbClient = db): Promise<HistoricalRow[]> {
  const prevDbRows = await executor.select().from(bomRows).where(eq(bomRows.revisionId, revisionId));
  const rowIds = prevDbRows.map((row) => row.id);
  const prevLocks = rowIds.length > 0
    ? await executor.select().from(lockedChoices).where(inArray(lockedChoices.rowId, rowIds))
    : [];

  const lockMap = new Map(prevLocks.map((row) => [row.rowId, row]));

  return prevDbRows.map((row) => ({
    rowId: row.id,
    designators: (row.designators as string[]) || [],
    value: row.value,
    footprint: row.footprint,
    mpn: row.mpn,
    lcscPart: row.lcscPart,
    status: row.status,
    lockedChoice: lockMap.get(row.id) ?? null,
  }));
}

export async function importBomCsv(params: {
  userId: string;
  projectName: string;
  input: string;
  filename: string;
  existingProjectId?: number;
  maxProjects?: number | null;
  maxRows?: number | null;
}): Promise<{ projectId: number; revisionId: number; version: number; diffSummary: { added: number; removed: number; changed: number } }> {
  const parsedRows = await parseInputCsv(params.input);
  if (params.maxRows != null && parsedRows.length > params.maxRows) {
    throw new RowLimitError(`Free tier supports up to ${params.maxRows} BOM rows. Upgrade to Solo for larger imports.`);
  }
  let project = params.existingProjectId ? await getOwnedProject(params.userId, params.existingProjectId) : null;

  if (!project) {
    project = await createProjectForUser({
      userId: params.userId,
      projectName: params.projectName,
      maxProjects: params.maxProjects,
    });
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${PROJECT_IMPORT_LOCK_NAMESPACE}, ${project.id})`);

    const latestRevision = await tx.query.bomRevisions.findFirst({
      where: eq(bomRevisions.projectId, project.id),
      orderBy: desc(bomRevisions.version),
    });

    const version = (latestRevision?.version ?? 0) + 1;
    const revisionInsert = await tx.insert(bomRevisions).values({
      projectId: project.id,
      version,
      importedAt: new Date(),
      sourceFormat: detectFormat(params.input),
      sourceFilename: params.filename,
      notes: null,
    }).returning({ id: bomRevisions.id });
    const revisionId = revisionInsert[0]!.id;

    const partsDb = await loadClassifications(tx);
    const previousRows = latestRevision ? await loadHistoricalRows(latestRevision.id, tx) : [];
    const carryRows = carryForwardLockedChoices(parsedRows.map((row) => ({ ...row, lockedChoice: null })), previousRows);
    const enrichedRows = carryRows.map((row) => {
      const jlcTier = classifyJlcPart(row.lcscPart, partsDb);
      return {
        ...row,
        status: normalizeStatus(row),
        jlcTier,
        jlcLoadingFee: jlcTier === 'extended' ? '3' : '0',
      };
    });

    const insertedRows = await tx.insert(bomRows).values(enrichedRows.map((row) => ({
      revisionId,
      designators: row.designators,
      quantity: row.quantity,
      value: row.value,
      footprint: row.footprint,
      mpn: row.mpn,
      manufacturer: row.manufacturer,
      lcscPart: row.lcscPart,
      status: row.status,
      jlcTier: row.jlcTier,
      jlcLoadingFee: row.jlcLoadingFee,
      userNotes: null,
      lastRefreshedAt: new Date(),
    }))).returning({ id: bomRows.id, designators: bomRows.designators, value: bomRows.value });

    const diffs = diffRows(
      previousRows,
      enrichedRows.map((row) => ({
        designators: row.designators,
        value: row.value,
        footprint: row.footprint,
        mpn: row.mpn,
        lcscPart: row.lcscPart,
        status: row.status,
      })),
    );

    for (const row of insertedRows) {
      const matched = carryRows.find((item) => item.designators.join(',') === (row.designators as string[]).join(',') && item.value === row.value);
      if (matched?.lockedChoice && typeof matched.lockedChoice === 'object') {
        const lock = matched.lockedChoice as LockInsert;
        await tx.insert(lockedChoices).values({
          rowId: row.id,
          source: lock.source,
          sku: lock.sku ?? null,
          unitPrice: lock.unitPrice ?? null,
          currency: lock.currency ?? 'USD',
          notes: lock.notes ?? null,
        });
      }
    }

    return {
      projectId: project.id,
      revisionId,
      version,
      diffSummary: {
        added: diffs.filter((diff) => diff.kind === 'added').length,
        removed: diffs.filter((diff) => diff.kind === 'removed').length,
        changed: diffs.filter((diff) => diff.kind === 'changed').length,
      },
    };
  });
}

async function buildRowsForRevision(revisionId: number): Promise<SnapshotRow[]> {
  const rows = await db.select().from(bomRows).where(eq(bomRows.revisionId, revisionId));
  const rowIds = rows.map((row) => row.id);
  const offers = rowIds.length > 0
    ? await db.select({ offer: localOffers, rowId: localOffers.rowId }).from(localOffers).where(inArray(localOffers.rowId, rowIds))
    : [];
  const locks = rowIds.length > 0
    ? await db.select({ lock: lockedChoices, rowId: lockedChoices.rowId }).from(lockedChoices).where(inArray(lockedChoices.rowId, rowIds))
    : [];

  const offersByRow = new Map<number, typeof offers[number]['offer'][]>();
  for (const item of offers) {
    offersByRow.set(item.rowId, [...(offersByRow.get(item.rowId) ?? []), item.offer]);
  }

  const locksByRow = new Map<number, typeof locks[number]['lock']>();
  for (const item of locks) locksByRow.set(item.rowId, item.lock);

  return rows.map((row) => ({
    ...row,
    offers: offersByRow.get(row.id) ?? [],
    lockedChoice: locksByRow.get(row.id) ?? null,
  }));
}

export async function getOwnedProjectSnapshot(userId: string, projectId: number) {
  const project = await getOwnedProject(userId, projectId);
  if (!project) return null;

  const revisions = await db.query.bomRevisions.findMany({
    where: eq(bomRevisions.projectId, projectId),
    orderBy: desc(bomRevisions.version),
  });
  const latestRevision = revisions[0] ?? null;
  const previousRevision = revisions[1] ?? null;
  const rows = latestRevision ? await buildRowsForRevision(latestRevision.id) : [];
  const previousRows = previousRevision ? await buildRowsForRevision(previousRevision.id) : [];

  const diff = latestRevision && previousRevision
    ? diffRows(
      previousRows.map((row) => ({
        designators: row.designators as string[],
        value: row.value,
        footprint: row.footprint,
        mpn: row.mpn,
        lcscPart: row.lcscPart,
        status: row.status,
      })),
      rows.map((row) => ({
        designators: row.designators as string[],
        value: row.value,
        footprint: row.footprint,
        mpn: row.mpn,
        lcscPart: row.lcscPart,
        status: row.status,
      })),
    )
    : [];

  return {
    project,
    revisions,
    latestRevision,
    previousRevision,
    rows,
    diff: {
      items: diff,
      added: diff.filter((item) => item.kind === 'added').length,
      removed: diff.filter((item) => item.kind === 'removed').length,
      changed: diff.filter((item) => item.kind === 'changed').length,
    },
  };
}
