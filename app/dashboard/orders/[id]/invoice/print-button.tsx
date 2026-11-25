'use client';

import { Printer } from 'lucide-react';
import { ACTION } from '@/components/admin/styles';

/**
 * The one piece of this invoice that has to run in the browser: `window.print()`.
 *
 * The invoice itself is a server component — it reads the order and the shop's contact
 * details straight from the repositories, with no fetch and no loading state — so this is
 * deliberately the smallest possible client island rather than a reason to make the whole page
 * client-side.
 *
 * No PDF library. The browser's own print dialogue produces a PDF on every platform the owner
 * uses, respects the paper size the shop actually has, and needs nothing shipped to the
 * browser; the print stylesheet on the page is what makes the output usable.
 */
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={ACTION}>
      <Printer size={15} strokeWidth={2} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
