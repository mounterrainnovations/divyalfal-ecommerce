import { PrismaClient } from '@prisma/client';

const prismaGlobal = global as unknown as { prisma: PrismaClient | undefined };

/**
 * Prisma Client instance with singleton pattern for serverless environments.
 * Reuses the same instance to prevent connection exhaustion in hot-reload and serverless functions.
 */
export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!prismaGlobal.prisma) {
  prismaGlobal.prisma = prisma;
}
