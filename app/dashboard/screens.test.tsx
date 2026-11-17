// The four other new screens, with the database answering.
//
// The CMS tables exist in no database yet, so none of these screens can be clicked through
// against real data; `fetch` is stubbed and the real components render. What is checked here
// is only what would be expensive to get wrong and invisible until it was: the usage count and
// the 409 refusal in Media, the order the Homepage save actually sends, the validation that
// stops a Settings patch, and the unread arithmetic in Enquiries.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MediaPage from './media/page';
import HomepagePage from './homepage/page';
import SettingsPage from './settings/page';
import EnquiriesPage from './enquiries/page';

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[] = [];

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Route by the start of the URL; the first match wins, so put the specific ones first. */
function stub(routes: [string, (call: Call) => Response][]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        url: String(url),
        method: init?.method ?? 'GET',
        body:
          init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      for (const [prefix, reply] of routes) {
        if (call.url.startsWith(prefix)) return reply(call);
      }
      return answer({ error: `unexpected ${call.method} ${call.url}` }, 404);
    })
  );
}

const NOT_SET_UP = () =>
  answer({ error: 'The CMS tables are not in this database yet.', setup: 'pending' }, 503);

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------------------------

const ASSET = {
  id: 'asset-1',
  url: 'https://example.test/storage/v1/object/public/product-images/products/saree.webp',
  path: 'products/saree.webp',
  kind: 'IMAGE' as const,
  alt: 'Gold silk saree on a wooden hanger',
  tags: ['sample'],
  bytes: 240_000,
  mimeType: 'image/webp',
  width: 1200,
  height: 1600,
  createdAt: '2026-11-17T10:00:00.000Z',
};

describe('the media library', () => {
  it('shows where each file is used, and refuses a deletion by naming the uses', async () => {
    stub([
      [
        '/api/admin/media/asset-1',
        () =>
          answer(
            {
              error: 'This file is still in use and was not deleted.',
              usage: { total: 3, products: 2, blocks: 0, slides: 1 },
            },
            409
          ),
      ],
      [
        '/api/admin/media',
        () =>
          answer({
            assets: [ASSET],
            nextCursor: null,
            usage: { 'asset-1': { total: 3, products: 2, blocks: 0, slides: 1 } },
          }),
      ],
    ]);

    render(<MediaPage />);

    const tile = await screen.findByRole('button', { name: /Gold silk saree/ });
    expect(tile).toHaveTextContent('used in 3 places');

    fireEvent.click(tile);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete this file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }));

    // The refusal names the uses rather than reporting a failure. (The sheet says the same
    // thing before the attempt, so the phrase is there twice by design.)
    expect(await screen.findByText(/was not deleted: it is still used by/)).toHaveTextContent(
      '2 products and 1 gallery slide'
    );
    // And the row is still there.
    expect(screen.getByRole('button', { name: /Gold silk saree/ })).toBeInTheDocument();
  });

  it('says plainly when the tables are missing', async () => {
    stub([['/api/admin/media', NOT_SET_UP]]);
    render(<MediaPage />);
    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------------------------

const SECTIONS = [
  { key: 'hero', label: 'Hero', order: 0, visible: true, productIds: [] },
  { key: 'categories', label: 'Categories', order: 1, visible: true, productIds: [] },
  { key: 'collection', label: 'Collection', order: 2, visible: true, productIds: [] },
];

describe('the homepage screen', () => {
  const route = () => [
    [
      '/api/admin/homepage',
      (call: Call) =>
        call.method === 'PUT'
          ? answer({ saved: ['hero', 'categories', 'collection'], unknown: [], revalidated: true })
          : answer({ sections: SECTIONS }),
    ],
    ['/api/products', () => answer({ products: [] })],
  ] as [string, (call: Call) => Response][];

  it('moves a movement by keyboard and saves the order it shows', async () => {
    stub(route());
    render(<HomepagePage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Move Collection up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save arrangement' }));

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    const sent = calls.find(call => call.method === 'PUT')!.body as {
      sections: { key: string; order: number }[];
    };
    expect(sent.sections.map(section => section.key)).toEqual([
      'hero',
      'collection',
      'categories',
    ]);
    expect(sent.sections.map(section => section.order)).toEqual([0, 1, 2]);
  });

  it('says an empty selection means the automatic one, and what that query is', async () => {
    stub(route());
    render(<HomepagePage />);
    expect(await screen.findByText(/Automatic: the four newest garments\./)).toBeInTheDocument();
  });

  it('does not pretend that hiding a movement changes the shop today', async () => {
    stub(route());
    render(<HomepagePage />);
    expect(await screen.findByText('What the shop reads today')).toBeInTheDocument();
    expect(screen.getByText(/are saved here but are not read by the public homepage yet/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

describe('the settings screen', () => {
  const settings = {
    whatsapp: '919977057045',
    'contact.email': 'divyafalthecreations@gmail.com',
    'contact.hours': ['Monday to Saturday', '11am to 8pm'],
    'seo.title': 'Divyafal',
  };

  it('refuses to send a patch with a malformed address, and sends only what changed', async () => {
    stub([
      [
        '/api/admin/settings',
        (call: Call) =>
          call.method === 'PUT' ? answer({ settings }) : answer({ settings, editableKeys: [] }),
      ],
    ]);

    render(<SettingsPage />);

    const instagram = await screen.findByLabelText('Instagram');
    fireEvent.change(instagram, { target: { value: 'instagram.com/divyafal' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

    expect(await screen.findByText(/not a complete web address/)).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PUT')).toBe(false);

    fireEvent.change(instagram, { target: { value: 'https://instagram.com/divyafal' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    expect(calls.find(call => call.method === 'PUT')!.body).toEqual({
      'social.instagram': 'https://instagram.com/divyafal',
    });
  });

  it('shows the stored hours one per line and never shows the seed marker', async () => {
    stub([['/api/admin/settings', () => answer({ settings, editableKeys: [] })]]);
    render(<SettingsPage />);

    expect(await screen.findByLabelText('Opening hours')).toHaveValue(
      'Monday to Saturday\n11am to 8pm'
    );
    expect(screen.queryByText(/seed\.gallery/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------------------------

const ENQUIRIES = [
  {
    id: 'e1',
    name: 'Asha Verma',
    email: 'asha@example.test',
    phone: null,
    message: 'Do you take commissions for a wedding lehenga?',
    source: 'contact' as const,
    status: 'UNREAD' as const,
    createdAt: '2026-11-17T09:30:00.000Z',
  },
  {
    id: 'e2',
    name: 'Ravi Nair',
    email: '',
    phone: '+919812345678',
    message: 'Applying for the academy.',
    source: 'academy' as const,
    status: 'READ' as const,
    createdAt: '2026-11-16T09:30:00.000Z',
  },
];

describe('the enquiries screen', () => {
  it('emphasises what is unread and marks one read without reloading the list', async () => {
    stub([
      [
        '/api/admin/enquiries/e1',
        () => answer({ ...ENQUIRIES[0], status: 'READ' }),
      ],
      [
        '/api/admin/enquiries',
        () => answer({ enquiries: ENQUIRIES, nextCursor: null, unread: 1 }),
      ],
    ]);

    render(<EnquiriesPage />);

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByText(/1 unread/)).toBeInTheDocument();
    // Unread is marked in words in the row, not by colour alone.
    expect(screen.getByRole('table')).toHaveTextContent('Unread');

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark read' })[0]);

    await waitFor(() =>
      expect(calls.some(call => call.method === 'PATCH')).toBe(true)
    );
    expect(calls.find(call => call.method === 'PATCH')!.body).toEqual({ status: 'READ' });
    expect(await screen.findByText(/Nothing unread/)).toBeInTheDocument();
  });

  it('opens the whole message, which is what the visitor typed and nothing else', async () => {
    stub([
      ['/api/admin/enquiries/e2', () => answer(ENQUIRIES[1])],
      ['/api/admin/enquiries', () => answer({ enquiries: ENQUIRIES, nextCursor: null, unread: 1 })],
    ]);

    render(<EnquiriesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ravi Nair' }));

    expect(await screen.findByText('Applying for the academy.')).toBeInTheDocument();
    expect(screen.getAllByText('Academy form').length).toBeGreaterThan(0);
    // No source tag leaks into the words: `source` is a column now, not a line of the message.
    expect(screen.queryByText(/\[source:/)).not.toBeInTheDocument();
  });

  it('says plainly when the tables are missing', async () => {
    stub([['/api/admin/enquiries', NOT_SET_UP]]);
    render(<EnquiriesPage />);
    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
  });
});
