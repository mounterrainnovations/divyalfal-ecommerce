import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reconcileOrderPayment } from '@/lib/payments/reconciliation';
import { isValidCronRequest } from '@/lib/utils/cron-auth';

export async function GET(request: Request) {
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find expired pending standard orders (limit to 50 to prevent timeout)
    const expiredOrders = await prisma.order.findMany({
      take: 50,
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

    const reconciliationResults = [];
    for (const order of expiredOrders) {
      reconciliationResults.push(
        await reconcileOrderPayment({
          id: order.id,
          profileId: order.profileId,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          razorpayOrderId: order.razorpayOrderId,
        })
      );
    }

    const ordersToCancel = expiredOrders.filter((order) => {
      const reconciliation = reconciliationResults.find((result) => result.orderId === order.id);
      return reconciliation?.outcome !== 'paid_reconciled' && reconciliation?.outcome !== 'already_paid';
    });

    if (ordersToCancel.length === 0) {
      return NextResponse.json({
        message: 'All expired orders were recovered during reconciliation',
        reconciliationResults,
      });
    }

    const results = await prisma.$transaction(async (tx) => {
      const processed = [];

      for (const order of ordersToCancel) {
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
      orderIds: results,
      reconciliationResults,
    });
  } catch (error) {
    console.error('Cron stock cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
