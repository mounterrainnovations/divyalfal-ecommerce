import { Prisma, type SiteSetting } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Site settings: contact details, the WhatsApp number, SEO metadata, shipping rates.
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

/**
 * Every key the admin may read and write.
 *
 * The first eight are what `prisma/seed-cms.ts` writes. The four after them — the Open Graph
 * image and the three social addresses — are **not seeded**, and that is deliberate:
 * `siteCopy.footer.social` is an empty array because no Instagram or Facebook address has ever
 * been supplied, and there is no Open Graph image in the site today. A seed cannot invent them,
 * but the Settings screen can offer the rows so that the client can supply them once, in the
 * obvious place, instead of someone editing a constant. A key with no row simply reads as
 * absent until it is first saved.
 *
 * **The four `shipping.*` keys are unseeded for a stronger reason: a shipping price is money.**
 * A seeded ₹99 would be a real rate the shop had never agreed to, and a seeded free-shipping
 * threshold would be a promise on a live site. So all four stay absent until the owner types
 * them, and absent means exactly that — no rate, no threshold, no promise — rather than a
 * default anyone could mistake for the shop's own figure. They are stored as the strings the
 * fields hold (this is a JSON column, and the screen round-trips text); the Settings screen
 * refuses to save one that is not a sensible number, so what lands in the column is a number
 * written as text and never "₹99 approx".
 *
 * `shipping.freeOver` blank means shipping is never free, not free always: a blank threshold
 * that meant "free above ₹0" would give away every delivery the moment the key was offered.
 * Whatever eventually reads these must treat an absent key as "the shop has not said", and ask,
 * rather than assume a zero.
 */
export const EDITABLE_SETTING_KEYS = [
  'whatsapp',
  'contact.phone',
  'contact.phoneDisplay',
  'contact.email',
  'contact.address',
  'contact.hours',
  'seo.title',
  'seo.description',
  'seo.ogImage',
  'social.instagram',
  'social.facebook',
  'social.youtube',
  'shipping.freeOver',
  'shipping.standardRate',
  'shipping.expressRate',
  'shipping.note',
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
