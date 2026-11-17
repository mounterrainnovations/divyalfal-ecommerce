// Guards the §5a.2 guardrail mechanically: every CMS migration must be purely additive,
// because it will eventually run against the client's live production database.
//
// Every migration AFTER the init is held to the same rules (the init is the already-deployed
// baseline). The `_cms` migration is additionally pinned to exactly the six new tables and RLS.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = path.resolve(__dirname, '..', 'prisma', 'migrations');

const NEW_TABLES = ['ContentBlock', 'Enquiry', 'HomepageSection', 'MediaAsset', 'SiteSetting', 'Slide'];

// Migration directories are timestamp-prefixed, so a lexical sort is chronological.
// dirs[0] is the already-deployed init baseline; everything after it is under guard.
function migrationDirs(): string[] {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

// Strip `-- line comments` so a comment mentioning a keyword cannot trip or hide a match.
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

// Split on `;` so a second statement on the same line cannot hide from the allowlist.
// (No DDL here carries a `;` inside a string literal; if one ever does, this errs toward
// flagging it, which is the safe direction.)
function splitStatements(sql: string): string[] {
  return stripComments(sql)
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// The only statement shapes a CMS migration may contain. Anchored at both ends.
const ALLOWED: RegExp[] = [
  /^CREATE TYPE "\w+" AS ENUM \('[^']*'(, '[^']*')*\)$/,
  /^CREATE TABLE "\w+" \(.*\)$/,
  /^CREATE (UNIQUE )?INDEX "\w+" ON "\w+"\("\w+"(, "\w+")*\)$/,
  /^ALTER TABLE "Slide" ADD CONSTRAINT "Slide_assetId_fkey" FOREIGN KEY \("assetId"\) REFERENCES "MediaAsset"\("id"\) ON DELETE RESTRICT ON UPDATE CASCADE$/,
  // Prisma bypasses RLS; enabling it with no policy closes the public PostgREST/anon-key path.
  /^ALTER TABLE "\w+" ENABLE ROW LEVEL SECURITY$/,
];

function violations(rawSql: string): string[] {
  const sql = stripComments(rawSql);
  const out: string[] = [];
  if (/\bDROP\b/i.test(sql)) out.push('DROP');
  if (/\bTRUNCATE\b/i.test(sql)) out.push('TRUNCATE');
  if (/\bDELETE\s+FROM\b/i.test(sql)) out.push('DELETE FROM');
  if (/\bALTER\s+TYPE\b/i.test(sql)) out.push('ALTER TYPE');
  if (/\bALTER\s+TABLE\s+(\S+\.)?"?Product"?/i.test(sql)) out.push('ALTER TABLE Product');
  if (/"Product"/.test(sql)) out.push('mentions "Product"');
  for (const stmt of splitStatements(rawSql)) {
    if (!ALLOWED.some((re) => re.test(stmt))) out.push(`not allowlisted: ${stmt.slice(0, 80)}`);
  }
  return out;
}

// Tolerates IF NOT EXISTS, a schema prefix and optional quoting, so a seventh table cannot
// hide behind syntax the plain capture would miss.
function createdTables(rawSql: string): string[] {
  const re = /CREATE\s+(?:UNLOGGED\s+|TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?\w+"?\.)?"?(\w+)"?/gi;
  return [...stripComments(rawSql).matchAll(re)].map((m) => m[1]).sort();
}

function rlsEnabledOn(rawSql: string): string[] {
  return [...stripComments(rawSql).matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)]
    .map((m) => m[1])
    .sort();
}

describe('the checker itself (it must actually catch what it claims to)', () => {
  const ok = 'CREATE TABLE "A" (\n  "id" TEXT NOT NULL\n);';

  it('accepts a plain additive statement', () => {
    expect(violations(ok)).toEqual([]);
  });

  it.each([
    ['DROP TABLE', 'DROP TABLE "Foo";'],
    ['DROP COLUMN', 'ALTER TABLE "Foo" DROP COLUMN "x";'],
    ['TRUNCATE', 'TRUNCATE "Foo";'],
    ['ALTER Product', 'ALTER TABLE "Product" ADD COLUMN "x" TEXT;'],
    ['ALTER public.Product', 'ALTER TABLE public."Product" ADD COLUMN "x" TEXT;'],
    ['FK onto Product', 'ALTER TABLE "Slide" ADD CONSTRAINT "c" FOREIGN KEY ("a") REFERENCES "Product"("id");'],
    ['INSERT', 'INSERT INTO "Foo" VALUES (1);'],
    ['CREATE TRIGGER', 'CREATE TRIGGER t AFTER INSERT ON "Foo" EXECUTE FUNCTION f();'],
    ['DISABLE RLS', 'ALTER TABLE "Enquiry" DISABLE ROW LEVEL SECURITY;'],
    ['IF NOT EXISTS table', 'CREATE TABLE IF NOT EXISTS "Evil" ("id" TEXT);'],
    ['schema-qualified table', 'CREATE TABLE public."Evil" ("id" TEXT);'],
    ['second statement on one line', 'CREATE INDEX "i" ON "A"("x"); DROP INDEX "i";'],
    ['second statement hidden after create', 'CREATE TABLE "A" ("id" TEXT); UPDATE "A" SET "id" = 1;'],
    ['RLS with trailing clause', 'ALTER TABLE "A" ENABLE ROW LEVEL SECURITY, DISABLE TRIGGER ALL;'],
  ])('flags: %s', (_name, sql) => {
    expect(violations(`${ok}\n${sql}`)).not.toEqual([]);
  });

  it('does not let a destructive statement hide in a comment, nor a comment trip the scan', () => {
    expect(violations(`${ok}\n-- DROP TABLE "Foo";`)).toEqual([]);
    expect(violations(`${ok}\nDROP TABLE "Foo"; -- looks harmless`)).not.toEqual([]);
  });

  it('captures table creation through IF NOT EXISTS and schema prefixes', () => {
    expect(createdTables('CREATE TABLE "A" ("id" TEXT);')).toEqual(['A']);
    expect(createdTables('CREATE TABLE IF NOT EXISTS "B" ("id" TEXT);')).toEqual(['B']);
    expect(createdTables('CREATE TABLE public."C" ("id" TEXT);')).toEqual(['C']);
    expect(createdTables('create table if not exists "public"."D" ("id" TEXT);')).toEqual(['D']);
  });
});

describe('CMS migrations (additive only)', () => {
  const dirs = migrationDirs();
  const guarded = dirs.slice(1);

  it('has the init baseline plus at least the cms migration', () => {
    expect(dirs.length).toBeGreaterThanOrEqual(2);
    expect(guarded.some((d) => /^\d{14}_cms$/.test(d))).toBe(true);
  });

  describe.each(guarded)('%s', (dir) => {
    const raw = readFileSync(path.join(MIGRATIONS, dir, 'migration.sql'), 'utf8');

    it('is purely additive, never touches Product, and only uses allowlisted statements', () => {
      expect(violations(raw)).toEqual([]);
    });
  });
});

describe('the _cms migration', () => {
  const dir = migrationDirs().find((d) => /^\d{14}_cms$/.test(d))!;
  const raw = readFileSync(path.join(MIGRATIONS, dir, 'migration.sql'), 'utf8');

  it('creates exactly the six new tables and nothing else', () => {
    expect(createdTables(raw)).toEqual(NEW_TABLES);
  });

  it('creates exactly the three new enums', () => {
    const created = [...stripComments(raw).matchAll(/CREATE TYPE "(\w+)"/g)].map((m) => m[1]).sort();
    expect(created).toEqual(['BlockKind', 'EnquiryStatus', 'MediaKind']);
  });

  it('enables row level security on every new table (the anon key is public)', () => {
    expect(rlsEnabledOn(raw)).toEqual(NEW_TABLES);
  });
});
