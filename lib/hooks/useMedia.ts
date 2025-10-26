'use client';

import { useState, useEffect } from 'react';

/**
 * Custom Hook to check ViewPort Width
 */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);

    // Initial check
    updateMatch();

    // Listen for changes
    media.addEventListener('change', updateMatch);

    // Cleanup
    return () => media.removeEventListener('change', updateMatch);
  }, [query]);

  return matches;
}
