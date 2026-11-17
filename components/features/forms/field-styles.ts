/**
 * Shared type-setting for the two form pages (contact and Virasat Academy). A field is a
 * label above a rule: no box, no fill, no radius. Focus draws a 2px ink outline, so the
 * state is visible to keyboard users and never relies on colour alone. Placeholders take a
 * solid soft-ink colour, never a faded one, so they hold the contrast floor.
 */
export const LABEL_CLASS = 'mb-1 block font-ui text-eyebrow font-normal uppercase text-ink-soft';

export const FIELD_CLASS =
  'block w-full rounded-none border-b border-ink bg-transparent px-0 py-3 font-ui text-body text-ink ' +
  'placeholder:text-ink-soft focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-4 focus-visible:outline-ink';
