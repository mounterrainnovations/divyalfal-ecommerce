import { Prisma, type SiteSetting } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Site settings: contact details, the WhatsApp number, SEO metadata.
 *
 * Two rules hold this table down.
 *
 * **An allowlist.** `SiteSetting` is a key/value table, so without one the admin could write any
 * key at all and nothing would read it. `saveSettings` refuses a key that is not in
 * `EDITABLE_SETTING_KEYS` instead of storing litter.
 *
 * **One hidden row.** `seed.gallery` is not a setting; it is the seed's marker that the
 * slideshow has been seeded once, and it is what stops a later seed run from reviving a gallery
 * the client deliberately emptied. It is therefore filtered out of every read the admin sees and
 * refused by every write -- not because it is secret, but because deleting it would quietly
 * re-arm a side effect nobody would connect to the deletion.
 */

/** The seed's internal marker. Never shown, never editable, never deletable through the API. */
export const INTERNAL_SETTING_KEYS = new Set(['seed.gallery']);

/** Every key the admin may read and write. Matches what `prisma/seed-cms.ts` writes. */
export const EDITABLE_SETTING_KEYS = [
  'whatsapp',
  'contact.phone',
  'contact.phoneDisplay',
  'contact.email',
  'contact.address',
  'contact.hours',
  'seo.title',
  'seo.description',
] as const;

export type SettingKey = (typeof EDITABLE_SETTING_KEYS)[number];

const EDITABLE = new Set<string>(EDITABLE_SETTING_KEYS);

/** Thrown when a patch names a key that is not editable (or is internal). */
export class UnknownSettingKeyError extends Error {
  readonly keys: string[];

  constructor(keys: string[]) {
    super(`Unknown setting key(s): ${keys.join(', ')}`);
    this.name = 'UnknownSettingKeyError';
    this.keys = keys;
  }
}

/** Editable settings as a plain object. The internal marker is not among them. */
export async function getSettings(): Promise<Record<string, Prisma.JsonValue>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...EDITABLE_SETTING_KEYS] } },
  });

  const settings: Record<string, Prisma.JsonValue> = {};
  for (const row of rows) {
    if (INTERNAL_SETTING_KEYS.has(row.key)) continue; // belt and braces
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * Write the keys in `patch`. Every key must be editable, and the whole patch is rejected if any
 * one is not -- a half-applied settings save is harder to reason about than a refused one.
 */
export async function saveSettings(
  patch: Record<string, unknown>
): Promise<Record<string, Prisma.JsonValue>> {
  const keys = Object.keys(patch);
  const rejected = keys.filter(key => !EDITABLE.has(key) || INTERNAL_SETTING_KEYS.has(key));
  if (rejected.length > 0) throw new UnknownSettingKeyError(rejected);
  if (keys.length === 0) return getSettings();

  await prisma.$transaction(
    keys.map(key =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: patch[key] as Prisma.InputJsonValue },
        update: { value: patch[key] as Prisma.InputJsonValue },
      })
    )
  );

  return getSettings();
}

/** One setting, or null. Internal keys always read as null through this. */
export async function getSetting(key: string): Promise<SiteSetting | null> {
  if (INTERNAL_SETTING_KEYS.has(key)) return null;
  return prisma.siteSetting.findUnique({ where: { key } });
}
