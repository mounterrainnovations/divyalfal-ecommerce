import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/slideshow
 * Returns all images from the public/slideshow folder, then the interim sample frames.
 *
 * PLACEHOLDER: `public/samples/atelier/` holds licensed stand-in frames (see
 * `public/samples/README.md`). They are listed after the real photographs so they never
 * displace them, and the whole second read is dropped, with that folder, when the real
 * gallery is complete.
 */
const FOLDERS = ['slideshow', 'samples/atelier'] as const;

export async function GET() {
  try {
    // Filter for image files only
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const images: string[] = [];

    for (const folder of FOLDERS) {
      let files: string[];
      try {
        files = await readdir(join(process.cwd(), 'public', folder));
      } catch (error) {
        // The sample folder is optional; only the real gallery folder is a hard failure.
        if (folder === 'slideshow') throw error;
        continue;
      }

      for (const file of files) {
        if (imageExtensions.some(ext => file.toLowerCase().endsWith(ext))) {
          images.push(`/${folder}/${file}`);
        }
      }
    }

    // Return array of image paths
    return NextResponse.json({ images });
  } catch (error) {
    console.error('[API] Error fetching slideshow images:', error);

    // Return empty array as fallback
    return NextResponse.json({ images: [] });
  }
}
