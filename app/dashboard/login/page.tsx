'use client';

import { useState } from 'react';
import Field, { TextInput } from '@/components/admin/Field';
import { ACTION, ACTION_QUIET, LABEL } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The one `/dashboard` route the middleware leaves open, and the path it redirects to, so
 * the path does not move.
 *
 * It renders outside the portal shell (`app/dashboard/layout.tsx` renders this route bare):
 * a rail and a sign-out button above a sign-in form would be furniture for a session that
 * does not exist yet.
 *
 * Nothing here decides who is signed in. On success the browser does a full navigation to
 * `/dashboard` so the new httpOnly cookie is sent with the request the middleware checks;
 * there is no client-side session state to go stale.
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
    <div className="flex min-h-screen items-center justify-center bg-paper px-[var(--gutter)] py-16">
      <div className="w-full max-w-[320px]">
        <p className={cn(LABEL, 'mb-3')}>Admin portal</p>
        <p className="font-display text-[28px] font-light uppercase tracking-(--tracking-wordmark) text-ink">
          {siteCopy.home.hero.wordmark}
        </p>
        <hr className="mt-5 mb-8 h-px w-full border-0 bg-gold" />

        <form onSubmit={onSubmit} className="space-y-6" noValidate>
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
            <TextInput
              id="admin-password"
              type={reveal ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setReveal(value => !value)}
              className={cn(ACTION_QUIET, 'mt-2')}
            >
              {reveal ? 'Hide password' : 'Show password'}
            </button>
          </Field>

          {/* Announced, so a failure is not silent for a screen reader. */}
          <p role="alert" aria-live="polite" className="font-ui text-caption text-sale">
            {error}
          </p>

          <button type="submit" disabled={busy} className={ACTION}>
            {busy ? 'Signing in' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
