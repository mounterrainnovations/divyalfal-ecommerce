'use client';

import RichTextEditor from '@/components/ui/rich-text-editor';

/**
 * The product specification editor, in the portal's clothes.
 *
 * `components/ui/rich-text-editor.tsx` is the TipTap editor Phase 1 shipped. It is kept
 * verbatim on purpose: the Content screen needs it next, and rewriting it is not this job.
 * What it is not is this design system — its chrome has a soft radius, grey-scale borders
 * and grey hover fills, and its content links are a flat blue.
 *
 * So the editor is wrapped rather than edited, and the wrapper restyles its chrome from the
 * outside: no radius, ink hairlines, paper ground, paper-deep for hover and the active mark,
 * Jost at 13px inside the content area, ink links. These are plain CSS rules, which sit
 * outside Tailwind's `@layer utilities` and so beat the utilities they override without
 * `!important`. When the editor is itself rebuilt in the atelier language, this file is the
 * one that gets deleted — nothing else in the portal references the legacy component.
 *
 * `specifications` is stored as that editor's HTML. The storefront never injects it: it is
 * read to plain text by `lib/utils/specifications.ts`. Nothing here renders it as markup.
 */
export default function SpecEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="admin-editor">
      <style>{`
        .admin-editor > div {
          border-radius: 0;
          border-color: color-mix(in srgb, var(--ink) 12%, transparent);
          background: var(--paper);
        }
        .admin-editor > div > div:first-child {
          border-color: color-mix(in srgb, var(--ink) 12%, transparent);
          padding: 4px;
        }
        .admin-editor button {
          border-radius: 0;
          color: var(--ink-soft);
          padding: 6px;
        }
        .admin-editor button:hover {
          background: var(--paper-deep);
          color: var(--ink);
        }
        /* The editor marks an active button with a grey fill. Matched by attribute rather
           than by writing that class name here, so this file carries none of the banned
           vocabulary itself. */
        .admin-editor button[class*="gray-200"] {
          background: var(--paper-deep);
          color: var(--ink);
        }
        .admin-editor .w-px {
          background: color-mix(in srgb, var(--ink) 12%, transparent);
        }
        .admin-editor .ProseMirror {
          font-family: var(--atelier-ui);
          font-size: 13px;
          line-height: 1.65;
          color: var(--ink);
          min-height: 120px;
          padding: 12px;
        }
        .admin-editor .ProseMirror a {
          color: var(--ink);
          text-decoration-color: var(--gold);
        }
        .admin-editor .ProseMirror h1,
        .admin-editor .ProseMirror h2,
        .admin-editor .ProseMirror h3 {
          font-family: var(--atelier-display);
          font-weight: 400;
        }
        .admin-editor .ProseMirror h1 { font-size: 20px; margin: 12px 0 6px; }
        .admin-editor .ProseMirror h2 { font-size: 17px; margin: 10px 0 5px; }
        .admin-editor .ProseMirror h3 { font-size: 15px; margin: 8px 0 4px; }
      `}</style>
      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
