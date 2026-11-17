import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import {
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  VIDEO_TYPES,
  VIDEO_MAX_BYTES,
  STORAGE_BUCKET,
} from './limits';

export async function POST(request: Request) {
  // First statement, before the body is read or storage is touched. It sits outside the main
  // try/catch below so a refusal can never be rewritten into that block's 500.
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);

    // Validate file type
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, WebP, GIF, MP4 and WebM are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size. The image branch keeps the product form's exact contract: 5MB, 400,
    // and that same message. Video gets its own larger cap, and a 413, which is what a
    // body-too-large refusal actually is.
    if (isImage) {
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
      }
    } else if (file.size > VIDEO_MAX_BYTES) {
      return NextResponse.json(
        { error: `Video too large. Maximum size is ${VIDEO_MAX_BYTES / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
