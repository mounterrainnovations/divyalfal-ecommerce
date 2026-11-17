'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Visible label; it is also the control's accessible name. */
  label?: string;
  className?: string;
}

/**
 * A native `<select>` set in the atelier type and ruled with a single ink line. A native
 * control is the point: the arrow keys, type-ahead, the mobile picker, screen-reader
 * announcements and the focus order all come from the platform, so none of it is rebuilt
 * here. Only the closed state is styled; the open list is the browser's own.
 */
export function SortDropdown({
  options,
  value,
  onValueChange,
  label = 'Sort by',
  className,
}: SortDropdownProps) {
  const id = useId();

  return (
    <div className={cn('flex items-baseline gap-4', className)}>
      <label htmlFor={id} className="font-ui text-eyebrow uppercase text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={event => onValueChange(event.target.value)}
          className="cursor-pointer appearance-none rounded-none border-0 border-b border-ink bg-transparent py-2 pr-8 font-ui text-caption text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-ink"
        />
      </div>
    </div>
  );
}
