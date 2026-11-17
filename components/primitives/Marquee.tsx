import type { ReactNode } from 'react';
import styles from './Marquee.module.css';

/**
 * A single line drifting slowly sideways. For one brand line and nowhere else. CSS only,
 * no JavaScript, no layout shift. The loop needs the line twice, so the second copy is
 * `aria-hidden` and assistive tech reads it once. Pauses on hover/focus and, under
 * `prefers-reduced-motion`, never moves (the first copy stays readable in place).
 */
export default function Marquee({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.viewport} font-display font-light text-display-3 text-ink`}>
      <div className={styles.track}>
        <span className={styles.copy}>{children}</span>
        <span className={styles.copy} aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}
