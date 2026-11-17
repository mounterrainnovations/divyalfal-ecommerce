import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import {
  EDITABLE_SETTING_KEYS,
  getSettings,
  saveSettings,
  UnknownSettingKeyError,
} from '@/lib/repositories/settings';

/**
 * GET /api/admin/settings -> `{ settings: Record<string, Json>, editableKeys: string[] }`.
 *
 * The seed's internal `seed.gallery` marker is not among them, by design: it is not a setting
 * and removing it would let a later seed run revive a gallery the client had emptied.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json({
      settings: await getSettings(),
      editableKeys: [...EDITABLE_SETTING_KEYS],
    });
  } catch (error) {
    console.error('[API] GET /api/admin/settings failed', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings with a patch object of `key: value` -> `{ settings }`.
 *
 * A patch naming any key outside the allowlist is refused whole, with 400 and the offending
 * keys; nothing is written.
 */
export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Either the patch itself, or `{ settings: patch }`.
  const patch =
    body && typeof body === 'object' && 'settings' in body
      ? (body as { settings: unknown }).settings
      : body;

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return NextResponse.json({ error: 'Expected an object of settings' }, { status: 400 });
  }

  try {
    const settings = await saveSettings(patch as Record<string, unknown>);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof UnknownSettingKeyError) {
      return NextResponse.json(
        { error: 'Unknown setting key', keys: error.keys, editableKeys: [...EDITABLE_SETTING_KEYS] },
        { status: 400 }
      );
    }
    console.error('[API] PUT /api/admin/settings failed', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
