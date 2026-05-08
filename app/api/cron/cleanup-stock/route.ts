import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  // Security check: Verify a cron secret to prevent unauthorized calls
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find expired pending standard orders
    const expiredOrders = await prisma.order.findMany({
      where: {
        type: 'STANDARD',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: { lt: thirtyMinutesAgo },
      },
      include: {
        items: true,
      },
    });

    if (expiredOrders.length === 0) {
      return NextResponse.json({ message: 'No expired orders found' });
    }

    const results = await prisma.$transaction(async (tx) => {
      const processed = [];

      for (const order of expiredOrders) {
        // Restore stock
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Mark order as CANCELLED
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });

        processed.push(order.id);
      }

      return processed;
    });

    return NextResponse.json({ 
      message: `Successfully cleaned up ${results.length} orders`,
      orderIds: results 
    });
  } catch (error) {
    console.error('Cron stock cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
