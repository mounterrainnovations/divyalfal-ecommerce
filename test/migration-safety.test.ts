// Guards the §5a.2 guardrail mechanically: the CMS migration must be purely additive,
// because it will eventually run against the client's live production database.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = path.resolve(__dirname, '..', 'prisma', 'migrations');

// Migration directories are timestamp-prefixed, so a lexical sort is chronological.
function migrationDirs(): string[] {
  return readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function latestMigrationPath(): string {
  const dirs = migrationDirs();
  return path.join(MIGRATIONS, dirs[dirs.length - 1], 'migration.sql');
}

// Strip `-- line comments` so a comment mentioning a keyword cannot trip or hide a match.
function statements(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

describe('CMS migration safety (additive only)', () => {
  const sql = statements(readFileSync(latestMigrationPath(), 'utf8'));

  it('is a new migration after the init, named cms', () => {
    const dirs = migrationDirs();
    expect(dirs.length).toBeGreaterThanOrEqual(2);
    expect(dirs[dirs.length - 1]).toMatch(/^\d{14}_cms$/);
  });

  it('contains no destructive statement', () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA|TYPE|INDEX|CONSTRAINT)\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\s+"?Product"?/i);
    expect(sql).not.toMatch(/\bALTER\s+TABLE\s+\S+\s+(DROP|ALTER\s+COLUMN|RENAME)\b/i);
    expect(sql).not.toMatch(/\bALTER\s+TYPE\b/i);
  });

  it('never touches Product at all', () => {
    expect(sql).not.toMatch(/"Product"/);
    expect(sql).not.toMatch(/REFERENCES\s+"Product"/i);
  });

  it('creates exactly the six new tables and nothing else', () => {
    const created = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]).sort();
    expect(created).toEqual([
      'ContentBlock',
      'Enquiry',
      'HomepageSection',
      'MediaAsset',
      'SiteSetting',
      'Slide',
    ]);
  });

  it('creates exactly the three new enums', () => {
    const created = [...sql.matchAll(/CREATE TYPE "(\w+)"/g)].map((m) => m[1]).sort();
    expect(created).toEqual(['BlockKind', 'EnquiryStatus', 'MediaKind']);
  });

  it('only issues CREATE statements and the one ALTER that adds the Slide foreign key', () => {
    const verbs = [...sql.matchAll(/^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b[^;]*/gim)].map(
      (m) => m[0].replace(/\s+/g, ' ').trim(),
    );
    for (const v of verbs) {
      const ok =
        /^CREATE (TYPE|TABLE|UNIQUE INDEX|INDEX) /i.test(v) ||
        /^ALTER TABLE "Slide" ADD CONSTRAINT "Slide_assetId_fkey" FOREIGN KEY/i.test(v);
      expect(ok, `unexpected statement: ${v}`).toBe(true);
    }
  });
});
