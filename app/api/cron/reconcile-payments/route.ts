import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reconcileOrderPayment } from '@/lib/payments/reconciliation';
import { isValidCronRequest } from '@/lib/utils/cron-auth';

export async function GET(request: Request) {
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const limit = Math.min(Number(searchParams.get('limit')) || 25, 100);
    const lookbackHours = Math.min(Number(searchParams.get('lookbackHours')) || 24, 168);

    const where = orderId
      ? { id: orderId }
      : {
          type: 'STANDARD' as const,
          status: 'PENDING' as const,
          paymentStatus: 'PENDING' as const,
          razorpayOrderId: { not: null },
          createdAt: {
            gte: new Date(Date.now() - lookbackHours * 60 * 60 * 1000),
          },
        };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: orderId ? 1 : limit,
      select: {
        id: true,
        profileId: true,
        totalAmount: true,
        paymentStatus: true,
        razorpayOrderId: true,
      },
    });

    const results = [];
    for (const order of orders) {
      results.push(await reconcileOrderPayment(order));
    }

    return NextResponse.json({
      processed: results.length,
      recovered: results.filter((result) => result.outcome === 'paid_reconciled').length,
      results,
    });
  } catch (error) {
    console.error('Payment reconciliation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
