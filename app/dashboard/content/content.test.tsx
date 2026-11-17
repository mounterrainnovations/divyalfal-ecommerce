// The two things about this screen that are easy to get wrong and impossible to see:
// whether an autosave writes `draft` and only `draft`, and whether a publish publishes what
// is on screen rather than what was on screen 800ms ago.
//
// The CMS tables do not exist in any database yet, so the populated screen cannot be clicked
// through in a browser. `fetch` is stubbed instead, which exercises the real component.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContentPage from './page';

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[] = [];
let publishResult = { published: ['home.hero.heading'], revalidated: true };

const BLOCKS = [
  {
    key: 'home.hero.brandLine',
    page: 'home',
    section: 'hero',
    label: 'Home / Hero / Brand line',
    kind: 'TEXT',
    draft: 'Woven in Bhopal',
    published: 'Woven in Bhopal',
    updatedAt: '2026-11-17T10:00:00.000Z',
  },
  {
    key: 'home.hero.heading',
    page: 'home',
    section: 'hero',
    label: 'Home / Hero / Heading',
    kind: 'TEXT',
    draft: 'The newer heading',
    published: 'The older heading',
    updatedAt: '2026-11-17T10:00:00.000Z',
  },
  {
    key: 'home.collection.title',
    page: 'home',
    section: 'collection',
    label: 'Home / Collection / Title',
    kind: 'TEXT',
    draft: 'The collection',
    published: 'The collection',
    updatedAt: '2026-11-17T10:00:00.000Z',
  },
  {
    key: 'contact.general.title',
    page: 'contact',
    section: 'general',
    label: 'Contact / Title',
    kind: 'TEXT',
    draft: 'Contact us',
    published: 'Contact us',
    updatedAt: '2026-11-17T10:00:00.000Z',
  },
];

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  calls = [];
  publishResult = { published: ['home.hero.heading'], revalidated: true };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url: String(url), method, body });

      if (String(url).startsWith('/api/admin/content?') || String(url) === '/api/admin/content') {
        return answer({ blocks: BLOCKS, pages: ['home', 'contact'] });
      }
      if (String(url) === '/api/admin/content/publish') return answer(publishResult);
      if (String(url).startsWith('/api/admin/content/')) return answer({ ok: true });
      return answer({ error: 'unexpected' }, 404);
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const puts = () => calls.filter(call => call.method === 'PUT');
const publishes = () => calls.filter(call => call.url === '/api/admin/content/publish');

describe('the content screen', () => {
  it('groups one page at a time by section, and badges only what is unpublished', async () => {
    render(<ContentPage />);

    // The first page's sections, not every page's.
    expect(await screen.findByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.queryByText('General')).not.toBeInTheDocument();

    // One of the two Hero blocks differs from its published value.
    expect(screen.getByText('1 unpublished')).toBeInTheDocument();

    // Closed to begin with: four hundred fields are not an editor.
    expect(screen.queryByLabelText('Brand line')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hero/ }));
    expect(screen.getByLabelText('Brand line')).toHaveValue('Woven in Bhopal');
    expect(screen.getByText('Unpublished changes')).toBeInTheDocument();
  });

  it('autosaves an edit as a draft, and publishes nothing by itself', async () => {
    render(<ContentPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Hero/ }));

    fireEvent.change(screen.getByLabelText('Brand line'), {
      target: { value: 'Woven in Bhopal, by hand' },
    });

    await waitFor(() => expect(puts()).toHaveLength(1), { timeout: 3000 });
    expect(puts()[0].url).toBe('/api/admin/content/home.hero.brandLine');
    expect(puts()[0].body).toEqual({ value: 'Woven in Bhopal, by hand' });
    expect(publishes()).toHaveLength(0);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('flushes a pending autosave before publishing, so it publishes what is on screen', async () => {
    render(<ContentPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Hero/ }));

    fireEvent.change(screen.getByLabelText('Brand line'), {
      target: { value: 'Typed, then published at once' },
    });
    // Inside the debounce window: the draft is not written yet.
    expect(puts()).toHaveLength(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Publish' })[0]);

    await waitFor(() => expect(publishes()).toHaveLength(1), { timeout: 3000 });
    expect(puts()).toHaveLength(1);
    expect(puts()[0].body).toEqual({ value: 'Typed, then published at once' });
    // The write came first; the publish copies what the write stored.
    expect(calls.indexOf(puts()[0])).toBeLessThan(calls.indexOf(publishes()[0]));
    expect(publishes()[0].body).toEqual({ keys: ['home.hero.brandLine'] });
  });

  it('says a publish is saved but not yet visible when revalidation failed', async () => {
    publishResult = { published: ['home.hero.heading'], revalidated: false };
    render(<ContentPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Hero/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Publish section' }));

    expect(await screen.findByText(/within a few minutes/)).toBeInTheDocument();
    expect(screen.queryByText(/is live on the shop now/)).not.toBeInTheDocument();
  });

  it('clears the badge for a block it has published, and leaves the rest alone', async () => {
    render(<ContentPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Hero/ }));
    expect(screen.getByText('Unpublished changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publish section' }));

    await waitFor(() => expect(screen.queryByText('Unpublished changes')).not.toBeInTheDocument());
    expect(await screen.findByText(/is live on the shop now/)).toBeInTheDocument();
  });
});

describe('the content screen with no tables', () => {
  it('says so plainly instead of failing or spinning', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        answer({ error: 'The CMS tables are not in this database yet.', setup: 'pending' }, 503)
      )
    );

    render(<ContentPage />);

    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });
});
