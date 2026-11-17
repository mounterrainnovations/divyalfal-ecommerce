import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The atelier type scale (`@theme` in app/globals.css) adds text-display-1|2|3, text-body,
 * text-caption and text-eyebrow. tailwind-merge does not know them and reads each as a text
 * *colour*, so `cn('text-eyebrow', 'text-ink')` silently dropped the size. Registering them
 * under `font-size` keeps size and colour as the separate groups they are. Add any new
 * `--text-*` token here too.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display-1', 'display-2', 'display-3', 'body', 'caption', 'eyebrow'] },
      ],
    },
  },
});

/**
 * Merges Tailwind CSS classes with proper precedence handling
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
