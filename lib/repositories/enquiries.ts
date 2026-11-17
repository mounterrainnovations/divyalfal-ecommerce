import type { Enquiry, EnquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Enquiries: what the two public forms write and the admin portal reads.
 *
 * Two shape decisions worth knowing about.
 *
 * **`source` is carried in the message, not in a column.** The CMS migration is written and
 * waiting to be applied to production; adding a column now would mean either editing a migration
 * the owner is about to run or shipping a second one, and neither is worth a label. So the source
 * is stored as a single machine-readable first line and stripped back out on read, which gives
 * the admin a `source` field and a clean message without touching the schema. If a column is
 * ever added, `parseStored` is the one place that changes.
 *
 * **The academy form has no email field.** `siteCopy.academy.form.fields` is eight fields and
 * none of them is an email address; its required contact detail is a phone number. So an email
 * is required for a contact enquiry and optional for an academy application, which must carry a
 * phone instead. The alternative was to invent an email field on a live page, and the storefront
 * copy is not ours to add to.
 */

export const ENQUIRY_SOURCES = ['contact', 'academy'] as const;
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const MESSAGE_MAX_LENGTH = 5000;
export const NAME_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_MAX_LENGTH = 40;

export interface CreateEnquiryInput {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source?: EnquirySource;
}

export interface EnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  source: EnquirySource | null;
  status: EnquiryStatus;
  createdAt: Date;
}

/** Thrown for every validation failure. `field` is for the caller's own messaging. */
export class EnquiryValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'EnquiryValidationError';
    this.field = field;
  }
}

/**
 * Deliberately loose: one `@`, something either side, a dot in the domain, no spaces. A stricter
 * pattern rejects valid addresses, and the only thing riding on this is whether a human can be
 * written back to.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SOURCE_LINE = /^\[source:\s*([a-z]+)\]\n?/;

const sourceLine = (source: EnquirySource) => `[source: ${source}]\n`;

/** Split a stored message back into its source tag and the words the visitor typed. */
export function parseStored(message: string): { source: EnquirySource | null; message: string } {
  const match = message.match(SOURCE_LINE);
  if (!match) return { source: null, message };
  const found = ENQUIRY_SOURCES.find(source => source === match[1]);
  return { source: found ?? null, message: message.slice(match[0].length) };
}

function present(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate and store one enquiry as UNREAD.
 *
 * Throws `EnquiryValidationError` before any write for anything missing, malformed or oversized.
 */
export async function createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
  const source = ENQUIRY_SOURCES.find(candidate => candidate === input.source);

  const name = present(input.name);
  const email = present(input.email);
  const phone = present(input.phone);
  const message = present(input.message);

  if (!name) throw new EnquiryValidationError('name', 'A name is required.');
  if (name.length > NAME_MAX_LENGTH) {
    throw new EnquiryValidationError('name', `A name may be at most ${NAME_MAX_LENGTH} characters.`);
  }

  if (!message) throw new EnquiryValidationError('message', 'A message is required.');
  if (message.length > MESSAGE_MAX_LENGTH) {
    throw new EnquiryValidationError(
      'message',
      `A message may be at most ${MESSAGE_MAX_LENGTH} characters.`
    );
  }

  if (phone.length > PHONE_MAX_LENGTH) {
    throw new EnquiryValidationError(
      'phone',
      `A phone number may be at most ${PHONE_MAX_LENGTH} characters.`
    );
  }

  // The academy form collects a phone number and no email address; every other source must
  // carry an email, because without one there is no way to answer the enquiry.
  const emailRequired = source !== 'academy';

  if (!email) {
    if (emailRequired) throw new EnquiryValidationError('email', 'An email address is required.');
    if (!phone) {
      throw new EnquiryValidationError('phone', 'A phone number or an email address is required.');
    }
  } else {
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      throw new EnquiryValidationError('email', 'That email address does not look right.');
    }
  }

  return prisma.enquiry.create({
    data: {
      name,
      // The column is not nullable. An academy application legitimately has no email, and an
      // empty string reads as "none given" rather than as a plausible-looking address.
      email,
      phone: phone || null,
      message: source ? `${sourceLine(source)}${message}` : message,
      status: 'UNREAD',
    },
  });
}

export interface ListEnquiriesOptions {
  status?: EnquiryStatus;
  cursor?: string;
  limit?: number;
}

export interface ListEnquiriesResult {
  enquiries: EnquiryRecord[];
  nextCursor: string | null;
  unread: number;
}

const LIST_LIMIT_DEFAULT = 50;
const LIST_LIMIT_MAX = 200;

/** Newest first, cursor-paginated, with the unread count the rail badge needs. */
export async function listEnquiries(
  options: ListEnquiriesOptions = {}
): Promise<ListEnquiriesResult> {
  const take = Math.min(Math.max(options.limit ?? LIST_LIMIT_DEFAULT, 1), LIST_LIMIT_MAX);

  const [rows, unread] = await Promise.all([
    prisma.enquiry.findMany({
      where: options.status ? { status: options.status } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    }),
    prisma.enquiry.count({ where: { status: 'UNREAD' } }),
  ]);

  const page = rows.slice(0, take);
  return {
    enquiries: page.map(toRecord),
    nextCursor: rows.length > take ? (page[page.length - 1]?.id ?? null) : null,
    unread,
  };
}

/** Thrown when an id names no enquiry. */
export class EnquiryNotFoundError extends Error {
  constructor(id: string) {
    super(`No enquiry with id ${id}`);
    this.name = 'EnquiryNotFoundError';
  }
}

export async function setEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<EnquiryRecord> {
  const existing = await prisma.enquiry.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new EnquiryNotFoundError(id);
  return toRecord(await prisma.enquiry.update({ where: { id }, data: { status } }));
}

function toRecord(enquiry: Enquiry): EnquiryRecord {
  const { source, message } = parseStored(enquiry.message);
  return {
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    message,
    source,
    status: enquiry.status,
    createdAt: enquiry.createdAt,
  };
}
