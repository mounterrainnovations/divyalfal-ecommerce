// @vitest-environment node
//
// The hermetic half of the seed's tests: an in-memory stand-in for the Prisma client, so these
// run in the default `npm test` with no database, no network and no `.env`. The live-database
// half is `seed-cms.test.ts`, run with `npm run test:seed`.
//
// What this file pins that the database tests cannot: the exact arguments the seed sends. In
// particular the EMPTY `update: {}` on every upsert, which is the clause that stops a re-seed
// overwriting what the client has edited. The seed also pre-reads existing keys and never sends
// them, so a wrong `update` would not show up as a changed row in a normal run; only a test on
// the call itself fails when that clause alone is wrong.
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { seedCms } from './seed-cms';

type Row = Record<string, unknown>;
type Model = 'siteSetting' | 'homepageSection' | 'contentBlock' | 'mediaAsset' | 'slide';
interface UpsertArgs {
  where: Row;
  create: Row;
  update: Row;
}

const KEY_FIELD: Record<Model, string> = {
  siteSetting: 'key',
  homepageSection: 'key',
  contentBlock: 'key',
  mediaAsset: 'id',
  slide: 'id',
};

function fakePrisma() {
  const tables = Object.fromEntries(
    (Object.keys(KEY_FIELD) as Model[]).map(model => [model, new Map<string, Row>()])
  ) as Record<Model, Map<string, Row>>;
  const upserts: { model: Model; args: UpsertArgs }[] = [];
  const transactions: number[] = []; // operation count of each $transaction

  const delegate = (model: Model) => {
    const field = KEY_FIELD[model];
    return {
      findMany: async (args?: { where?: { id?: { in?: string[] } } }) => {
        const ids = args?.where?.id?.in;
        return [...tables[model].values()].filter(row => !ids || ids.includes(String(row[field])));
      },
      findUnique: async ({ where }: { where: Row }) => tables[model].get(String(where[field])) ?? null,
      count: async () => tables[model].size,
      upsert: async (args: UpsertArgs) => {
        upserts.push({ model, args });
        const id = String(args.where[field]);
        const existing = tables[model].get(id);
        // Real upsert semantics: an existing row takes `update`, a missing one takes `create`.
        tables[model].set(id, existing ? { ...existing, ...args.update } : { ...args.create });
        return tables[model].get(id);
      },
    };
  };

  const client = {
    siteSetting: delegate('siteSetting'),
    homepageSection: delegate('homepageSection'),
    contentBlock: delegate('contentBlock'),
    mediaAsset: delegate('mediaAsset'),
    slide: delegate('slide'),
    $transaction: async (ops: Promise<unknown>[]) => {
      transactions.push(ops.length);
      return Promise.all(ops);
    },
    // Any access to the catalogue would be a bug: make it loud.
    get product(): never {
      throw new Error('the seed must not touch Product');
    },
  };
  return { prisma: client as unknown as PrismaClient, tables, upserts, transactions };
}

const callsFor = (upserts: { model: Model }[], model: Model) => upserts.filter(u => u.model === model);

describe('seedCms (in-memory client)', () => {
  it('sends an empty update clause on every upsert, for every model', async () => {
    const { prisma, upserts } = fakePrisma();
    await seedCms(prisma);

    for (const model of Object.keys(KEY_FIELD) as Model[]) {
      expect(callsFor(upserts, model).length, model).toBeGreaterThan(0);
    }
    for (const { model, args } of upserts) {
      expect(args.update, `${model} ${JSON.stringify(args.where)}`).toEqual({});
    }
  });

  it('seeds the expected row counts on a first run', async () => {
    const { prisma, tables } = fakePrisma();
    const result = await seedCms(prisma);
    expect(tables.contentBlock.size).toBe(383);
    expect(tables.homepageSection.size).toBe(7);
    expect(tables.mediaAsset.size).toBe(37);
    expect(tables.slide.size).toBe(10);
    expect(tables.siteSetting.size).toBe(9); // eight settings + the gallery marker
    expect(result).toEqual({ created: 383 + 7 + 37 + 10 + 9, skipped: 0 });
  });

  it('sends no write at all on a second run', async () => {
    const { prisma, upserts, transactions } = fakePrisma();
    const first = await seedCms(prisma);
    const writesAfterFirst = upserts.length;
    const transactionsAfterFirst = transactions.length;

    const second = await seedCms(prisma);
    expect(second).toEqual({ created: 0, skipped: first.created });
    expect(upserts.length).toBe(writesAfterFirst);
    expect(transactions.length).toBe(transactionsAfterFirst);
  });

  it('writes only what is missing, and keeps what the client edited', async () => {
    const { prisma, tables, upserts } = fakePrisma();
    await seedCms(prisma);
    tables.contentBlock.set('home.about.body', { key: 'home.about.body', published: 'edited by client' });
    tables.contentBlock.delete('home.hero.wordmark');
    upserts.length = 0;

    const result = await seedCms(prisma);
    expect(result.created).toBe(1);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].args.where).toEqual({ key: 'home.hero.wordmark' });
    expect(tables.contentBlock.get('home.about.body')!.published).toBe('edited by client');
  });

  it('seeds the gallery and its marker in a single transaction', async () => {
    const { prisma, tables, transactions } = fakePrisma();
    await seedCms(prisma);
    expect(transactions).toEqual([11]); // ten slides and the marker, atomically
    expect(tables.siteSetting.has('seed.gallery')).toBe(true);
  });

  it('does not recreate a gallery the client has emptied, nor a slide they deleted', async () => {
    const { prisma, tables, upserts } = fakePrisma();
    await seedCms(prisma);

    const [firstSlide] = [...tables.slide.keys()];
    tables.slide.delete(firstSlide);
    upserts.length = 0;
    await seedCms(prisma);
    expect(tables.slide.size).toBe(9);

    tables.slide.clear();
    await seedCms(prisma);
    expect(tables.slide.size).toBe(0);
    expect(callsFor(upserts, 'slide')).toHaveLength(0);
  });

  it('leaves slides made by hand before the seed alone', async () => {
    const { prisma, tables } = fakePrisma();
    tables.slide.set('hand-made', { id: 'hand-made' });
    await seedCms(prisma);
    expect(tables.slide.size).toBe(1);
    expect(tables.siteSetting.has('seed.gallery')).toBe(false);
  });
});
