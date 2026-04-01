import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/slideshow
 * Returns all images from the Supabase Storage 'slideshow' bucket.
 * This ensures compatibility with serverless environments (Vercel)
 * where local filesystem access is not persistent.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Fetch files from 'slideshow' bucket
    const { data, error } = await supabase.storage.from('slideshow').list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('[API] Error listing slideshow images from storage:', error);
      // Fallback to empty if bucket doesn't exist yet or other error
      return NextResponse.json({ images: [] });
    }

    // Filter for common image extensions just in case
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageFiles = data.filter(file => 
      imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );

    // Generate public URLs for each image
    // Note: Assuming the bucket is public. If not, signed URLs would be needed.
    const images = imageFiles.map(file => {
      const { data: { publicUrl } } = supabase.storage.from('slideshow').getPublicUrl(file.name);
      return publicUrl;
    });

    // If bucket is empty, returning empty array is better than failing
    return NextResponse.json({ images });
  } catch (error) {
    console.error('[API] Unexpected error in slideshow route:', error);
    return NextResponse.json({ images: [] });
  }
}
