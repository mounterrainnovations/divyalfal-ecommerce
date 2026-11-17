/**
 * The one request the portal's screens make.
 *
 * Five screens talk to eight endpoints, and each one has to tell apart four outcomes: it
 * worked, the CMS tables are not in this database yet, the session has gone, or something
 * actually failed. Written per screen that is four `catch` blocks apiece and four chances to
 * say "Failed to load" where the truth was "not set up yet".
 *
 * So every answer comes back as the same record, and nothing throws:
 *
 *  - `ok` — the request succeeded and `data` is parsed.
 *  - `notSetUp` — a 503 from `lib/admin/not-set-up.ts`. The expected state until the owner
 *    applies the migration, and the screens render one plain line for it.
 *  - `message` — what to show a human otherwise: the endpoint's own `error` when it sent one,
 *    since those are written for this reader ("This file is still in use…"), and a plain
 *    sentence when it did not.
 *  - `data` is parsed on a failure too: a 409 from the media library carries the usage
 *    breakdown that explains the refusal, and losing it would leave "it cannot be deleted"
 *    with no reason attached.
 */

export interface Answer<T> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  /** The tables are missing: expected, temporary, and not a failure to report as one. */
  notSetUp: boolean;
  /** The request was aborted by its caller (a superseded fetch). Render nothing for it. */
  aborted: boolean;
}

const SIGNED_OUT = 'The session has ended. Reload the page and sign in again.';
const UNREACHABLE = 'The portal could not reach the server. Check the connection and reload.';

export async function request<T>(url: string, init?: RequestInit): Promise<Answer<T>> {
  const base = { data: null as T | null, notSetUp: false, aborted: false };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    const aborted = init?.signal?.aborted === true || (error as Error)?.name === 'AbortError';
    return { ...base, ok: false, status: 0, aborted, message: aborted ? '' : UNREACHABLE };
  }

  // A 204 and an empty body are both legitimate; neither is JSON.
  const body = await response
    .clone()
    .json()
    .catch(() => null);

  if (response.ok) {
    return { ...base, ok: true, status: response.status, data: body as T, message: '' };
  }

  const sent = body && typeof body === 'object' ? (body as { error?: unknown }).error : undefined;
  const setup = body && typeof body === 'object' ? (body as { setup?: unknown }).setup : undefined;

  return {
    ok: false,
    status: response.status,
    data: body as T | null,
    notSetUp: response.status === 503 && setup === 'pending',
    aborted: false,
    message:
      response.status === 401
        ? SIGNED_OUT
        : typeof sent === 'string' && sent
          ? sent
          : `The server answered ${response.status}.`,
  };
}

/** `request` with a JSON body, for the three methods that carry one. */
export function send<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<Answer<T>> {
  return request<T>(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}
