import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/slideshow
 * Returns all images from the public/slideshow folder
 */
export async function GET() {
  try {
    const slideshowDir = join(process.cwd(), 'public', 'slideshow');
    
    // Read all files from the slideshow directory
    const files = await readdir(slideshowDir);
    
    // Filter for image files only
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageFiles = files.filter(file => 
      imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    
    // Return array of image paths
    const images = imageFiles.map(file => `/slideshow/${file}`);
    
    return NextResponse.json({ images });
  } catch (error) {
    console.error('[API] Error fetching slideshow images:', error);
    
    // Return empty array as fallback
    return NextResponse.json({ images: [] });
  }
}
