'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2, TriangleAlert } from 'lucide-react';
import Field, { TextInput } from '@/components/admin/Field';
import { ACTION, CARD, FOCUS, META } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The one `/dashboard` route the middleware leaves open, and the path it redirects to, so the
 * path does not move.
 *
 * It renders outside the portal frame (`AdminShell` renders this route bare): a sidebar and a
 * sign-out button above a sign-in form would be furniture for a session that does not exist
 * yet.
 *
 * Nothing here decides who is signed in. On success the browser does a full navigation to
 * `/dashboard` so the new httpOnly cookie is sent with the request the middleware checks; there
 * is no client-side session state to go stale.
 *
 * THE REVEAL BUTTON IS INSIDE THE FIELD. It used to be a text link under it, which on a form of
 * two inputs read as a third control. Inside the box it is what every other sign-in screen
 * does, and `aria-pressed` says which state it is in rather than relying on the icon.
 */
export default function DashboardLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        window.location.assign('/dashboard');
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(data.error || 'Those details were not accepted.');
    } catch {
      setError('The sign-in request could not be sent. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-[15px] font-semibold text-white"
          >
            {siteCopy.home.hero.wordmark.charAt(0)}
          </span>
          <span>
            <span className="block text-[15px] leading-5 font-semibold text-ink">
              {siteCopy.home.hero.wordmark}
            </span>
            <span className="block text-[12px] leading-4 text-slate-500">Admin portal</span>
          </span>
        </div>

        <div className={cn(CARD, 'p-6')}>
          <h1 className="text-[17px] leading-6 font-semibold tracking-[-0.01em] text-ink">
            Sign in
          </h1>
          <p className={cn(META, 'mt-1 mb-5')}>
            The portal is for the shop&rsquo;s own staff. Nothing here is public.
          </p>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field id="admin-email" label="Email">
              <TextInput
                id="admin-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </Field>

            <Field id="admin-password" label="Password">
              <div className="relative">
                <TextInput
                  id="admin-password"
                  type={reveal ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setReveal(value => !value)}
                  aria-pressed={reveal}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  className={cn(
                    'absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-slate-400 hover:text-ink',
                    FOCUS
                  )}
                >
                  {reveal ? (
                    <EyeOff size={15} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                  )}
                </button>
              </div>
            </Field>

            {/* Announced, and rendered only when there is something to announce — an empty
                alert region on every page load is how a screen reader learns to ignore it. */}
            {error ? (
              <p
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-5 text-red-700"
              >
                <TriangleAlert
                  size={15}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-red-500"
                />
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy} className={cn(ACTION, 'h-9 w-full')}>
              {busy ? (
                <>
                  <Loader2
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="animate-spin motion-reduce:animate-none"
                  />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
