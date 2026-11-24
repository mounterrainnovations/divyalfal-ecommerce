'use client';

import RichTextEditor from '@/components/ui/rich-text-editor';

/**
 * The rich-text editor, in the portal's clothes.
 *
 * `components/ui/rich-text-editor.tsx` is the TipTap editor Phase 1 shipped, and it is kept
 * verbatim on purpose: it belongs to the storefront's component library, another agent owns
 * that directory, and rewriting it is not this job. What it is not is this design system — its
 * chrome has its own radius, its own greys and a flat blue for links.
 *
 * So the editor is wrapped rather than edited, and the wrapper restyles its chrome from the
 * outside to match the portal's inputs: a slate border, a small radius, slate icons, a slate
 * hover and a slate fill for the active mark, 13px UI type in the content area and ink links.
 * These are plain CSS rules, which sit outside Tailwind's `@layer utilities` and so beat the
 * utilities they override without `!important`.
 *
 * WHY THE RULES ARE HERE AND NOT IN `dashboard.css`. They exist only to cancel another
 * component's styling, and they should be deleted in the same commit that replaces it. Keeping
 * them next to the wrapper that needs them means that deletion is one file, not a hunt.
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
          border-radius: 6px;
          border-color: #cbd5e1;
          background: #ffffff;
        }
        .admin-editor > div > div:first-child {
          border-color: #e2e8f0;
          background: #f8fafc;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          padding: 4px;
        }
        .admin-editor button {
          border-radius: 4px;
          color: #475569;
          padding: 6px;
        }
        .admin-editor button:hover {
          background: #e2e8f0;
          color: var(--ink);
        }
        /* The editor marks an active button with a grey fill of its own. Matched by attribute
           rather than by naming its class here, so this file does not hard-code the other
           component's internals any more than it has to. */
        .admin-editor button[class*="gray-200"] {
          background: #e2e8f0;
          color: var(--ink);
        }
        .admin-editor .w-px {
          background: #e2e8f0;
        }
        .admin-editor .ProseMirror {
          font-family: var(--ds-font);
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink);
          min-height: 120px;
          padding: 10px 12px;
        }
        .admin-editor .ProseMirror a {
          color: var(--ink);
          text-decoration-color: #94a3b8;
        }
        .admin-editor .ProseMirror h1,
        .admin-editor .ProseMirror h2,
        .admin-editor .ProseMirror h3 {
          font-family: var(--ds-font);
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .admin-editor .ProseMirror h1 { font-size: 18px; margin: 12px 0 6px; }
        .admin-editor .ProseMirror h2 { font-size: 16px; margin: 10px 0 5px; }
        .admin-editor .ProseMirror h3 { font-size: 14px; margin: 8px 0 4px; }
      `}</style>
      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
