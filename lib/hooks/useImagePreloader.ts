import { useEffect, useState } from 'react';

interface UseImagePreloaderOptions {
  urls: string[];
  maxConcurrent?: number;
}

interface PreloadResult {
  loaded: number;
  total: number;
  isComplete: boolean;
  progress: number;
}

/**
 * Hook to preload images in the background with progress tracking
 * @param urls - Array of image URLs to preload
 * @param maxConcurrent - Maximum number of concurrent image loads (default: 6)
 * @returns Preload progress information
 */
export function useImagePreloader({ urls, maxConcurrent = 6 }: UseImagePreloaderOptions): PreloadResult {
  const [loaded, setLoaded] = useState(0);
  const total = urls.length;

  useEffect(() => {
    if (urls.length === 0) return;

    let loadedCount = 0;
    const queue = [...urls];
    const activeLoads = new Set<Promise<void>>();

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        // Use document.createElement to avoid conflicts with Next.js Image
        const img = document.createElement('img');
        img.onload = () => {
          loadedCount++;
          setLoaded(loadedCount);
          resolve();
        };
        img.onerror = () => {
          // Still count as "loaded" even on error to prevent blocking
          loadedCount++;
          setLoaded(loadedCount);
          resolve();
        };
        img.src = url;
      });
    };

    const processQueue = async () => {
      while (queue.length > 0) {
        while (activeLoads.size < maxConcurrent && queue.length > 0) {
          const url = queue.shift();
          if (url) {
            const loadPromise = loadImage(url);
            activeLoads.add(loadPromise);
            loadPromise.finally(() => {
              activeLoads.delete(loadPromise);
            });
          }
        }
        // Wait for at least one active load to complete
        if (activeLoads.size > 0) {
          await Promise.race(activeLoads);
        }
      }
      // Wait for all remaining loads
      await Promise.all(activeLoads);
    };

    processQueue();

    // Cleanup function
    return () => {
      // No cleanup needed for image loading
    };
  }, [urls, maxConcurrent]);

  return {
    loaded,
    total,
    isComplete: loaded === total && total > 0,
    progress: total > 0 ? (loaded / total) * 100 : 0,
  };
}

