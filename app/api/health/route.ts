import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasDirectUrl = !!process.env.DIRECT_URL;

    // Test database connection
    let dbConnected = false;
    let dbError: string | null = null;
    let tableExists = false;
    let productCount = 0;

    try {
      // Try to connect and query
      productCount = await prisma.product.count();
      dbConnected = true;
      tableExists = true;
    } catch (error) {
      dbConnected = false;
      dbError = error instanceof Error ? error.message : 'Unknown database error';
      console.error('Database connection error:', error);
    }

    return NextResponse.json({
      status: dbConnected ? 'healthy' : 'unhealthy',
      environment: {
        hasDatabaseUrl,
        hasDirectUrl,
        nodeEnv: process.env.NODE_ENV,
      },
      database: {
        connected: dbConnected,
        tableExists,
        productCount,
        error: dbError,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'error',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

