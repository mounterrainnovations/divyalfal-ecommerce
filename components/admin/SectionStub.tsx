import ScreenHead from './ScreenHead';
import { LABEL, RULE } from './styles';
import { cn } from '@/lib/utils';

/**
 * A section that exists as a route but not yet as a screen.
 *
 * It is here instead of a 404 deliberately: the rail lists seven sections, and a link that
 * dead-ends reads as a broken portal rather than an unfinished one. One line, naming what
 * will be here, is honest and shows the shape of what is coming.
 */
export default function SectionStub({
  title,
  summary,
}: {
  title: string;
  /** What this screen will do, in one sentence. Not a promise about when. */
  summary: string;
}) {
  return (
    <div className="max-w-[1120px] px-[var(--gutter)] py-6">
      <ScreenHead eyebrow="Portal" title={title} />
      <div className={cn('border-t pt-4', RULE)}>
        <p className={cn(LABEL, 'mb-2')}>Not built yet</p>
        <p className="measure font-ui text-caption text-ink-soft">{summary}</p>
      </div>
    </div>
  );
}
