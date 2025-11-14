import { Prisma } from '@prisma/client';

/**
 * Retry database operations with exponential backoff
 * Handles connection issues in serverless environments
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection-related error that we should retry
      const isRetryableError =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P1001' || // Can't reach database server
          error.code === 'P1017' || // Server has closed the connection
          error.code === 'P2028'); // Transaction API error

      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      console.log(
        `[API] Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        error.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
