import { NextResponse } from 'next/server';

/**
 * "The CMS tables are not in this database yet" — told apart from a real failure, and said
 * once, in one voice.
 *
 * The CMS migration is written and still unapplied, so for now every admin screen but
 * Products and Overview queries a table that does not exist. That is the *expected* state
 * until the owner runs the migration, and it must not read as a broken portal: a 500 with
 * "Failed to load media" sends someone looking for a bug, and a screen that spins forever is
 * worse. So the condition is detected where it happens, answered with **503 and
 * `setup: 'pending'`**, and every screen renders one plain line from it.
 *
 * 503 rather than 500 on purpose: the request was fine, the service is not ready yet, and
 * this is temporary. The flag is what the screens actually branch on; the status is for
 * anyone reading the network tab.
 */

/** The one sentence every screen shows for this state. */
export const NOT_SET_UP_MESSAGE =
  'The CMS tables are not in this database yet. Once the migration has been applied, this screen fills itself.';

/**
 * Whether an error is Postgres saying the relation is missing, rather than anything else.
 *
 * Prisma reports a missing table as P2021 through the query builder, but the media usage
 * count runs `$queryRaw`, and a raw query surfaces the database's own error under P2010 with
 * the text in the message — so the text is matched as well as the code. Both forms are
 * checked because the alternative is one of the eight screens getting this wrong.
 */
export function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = (error as { code?: unknown }).code;
  if (code === 'P2021' || code === 'P2022') return true;
  // Postgres' own SQLSTATE for undefined_table / undefined_column, through a raw query.
  if (code === '42P01' || code === '42703') return true;

  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string') return false;
  return (
    /does not exist in the current database/i.test(message) ||
    /relation "[^"]+" does not exist/i.test(message) ||
    /\bundefined_table\b/i.test(message)
  );
}

/** The 503 every admin route answers with while the tables are missing. */
export function notSetUpResponse(): NextResponse {
  return NextResponse.json({ error: NOT_SET_UP_MESSAGE, setup: 'pending' }, { status: 503 });
}
