import { PrismaClient } from '@prisma/client';

const prismaGlobal = global as unknown as { prisma: PrismaClient | undefined };

// Schema updated: category maps to "type" column, createdAt/updatedAt map to quoted columns
// In serverless environments (Vercel), we need to reuse the same instance
export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Store in global to prevent multiple instances in serverless environments
if (!prismaGlobal.prisma) {
  prismaGlobal.prisma = prisma;
}
