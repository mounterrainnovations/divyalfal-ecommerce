import Link from 'next/link';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The deep strip above the navigation: what the house does, and the one thing it wants asked.
 *
 * WHY IT IS A SERVER COMPONENT. It has no state, no interaction and no reason to hydrate. The
 * navbar below it is a client component because it owns a menu; this is three links and a rule,
 * so it stays on the server and costs the page nothing.
 *
 * WHY `--accent-sale` AND NOT A NEW COLOUR. `#8C2F2F` is already in `app/globals.css`, already
 * the deepest red the shop uses, and already the one the sale badges wear. The mock-up's bar is
 * within a shade of it, and a second maroon a shade away from the first is the kind of thing
 * that reads as a mistake on a real screen. One red.
 *
 * WHAT IT DOES NOT CLAIM. "Book a Studio Appointment" goes to the contact page, because that is
 * the only way this shop can take a booking: there is no calendar, no scheduling, no slots. The
 * words are the owner's, from their own mock-up; the destination is the honest one.
 */
export default function AnnouncementBar() {
  const { tagline, appointment } = siteCopy.announcement;

  return (
    <div className="w-full bg-[var(--accent-sale)] text-white">
      <div className="mx-auto flex h-10 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/*
          The three words. Below `sm` only the first survives: three phrases and two separators
          do not fit beside the appointment link on a 390px screen, and a bar that wraps to two
          lines pushes the whole page down for no information gained.
        */}
        <p className="flex min-w-0 items-center gap-2 truncate text-[11px] tracking-[0.14em] text-white/90 uppercase sm:gap-2.5 sm:text-[11.5px]">
          <span aria-hidden="true" className="text-white/50">
            &bull;
          </span>
          {tagline.map((phrase, index) => (
            <span
              key={phrase}
              className={index === 0 ? 'truncate' : 'hidden truncate sm:inline'}
            >
              {index > 0 ? <span className="mr-2 text-white/35 sm:mr-2.5">|</span> : null}
              {phrase}
            </span>
          ))}
        </p>

        <Link
          href={appointment.href}
          className="group flex shrink-0 items-center gap-2 text-[11px] tracking-[0.12em] text-white uppercase transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[11.5px]"
        >
          <CalendarDays size={14} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
          <span className="hidden sm:inline">{appointment.label}</span>
          {/* On a phone the verb alone carries it; the calendar icon says the rest. */}
          <span className="sm:hidden">Book</span>
          <ArrowRight
            size={13}
            strokeWidth={1.6}
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </div>
  );
}
