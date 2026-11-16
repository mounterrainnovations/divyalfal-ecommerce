import { cn } from '@/lib/utils';

/** A 1px gold rule. Gold is only ever a hairline or a small mark, never a fill. */
export default function HairlineRule({ className }: { className?: string }) {
  return <hr className={cn('m-0 h-px w-full border-0 bg-gold', className)} />;
}
