import ScreenHead from './ScreenHead';
import Notice from './Notice';
import { SCREEN } from './styles';

/**
 * A section that exists as a route but not yet as a screen.
 *
 * It is here instead of a 404 deliberately: the sidebar lists seven sections, and a link that
 * dead-ends reads as a broken portal rather than an unfinished one. One line, naming what will
 * be here, is honest and shows the shape of what is coming.
 *
 * Nothing renders this today — all seven screens are built — and it is kept because the next
 * section added to the sidebar will want it on the day the route lands and the screen has not.
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
    <div className={SCREEN}>
      <ScreenHead title={title} />
      <Notice label="Not built yet">{summary}</Notice>
    </div>
  );
}
