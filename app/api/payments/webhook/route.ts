import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaymentsService } from '@/lib/payments';
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';


export async function POST(req: Request) {
  try {
    const paymentsService = getPaymentsService();
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const providerEventId = req.headers.get('x-razorpay-event-id') || undefined;

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = await paymentsService.processWebhook(body, signature, providerEventId);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Store the event for audit purposes
    await prisma.paymentEvent.create({
      data: {
        id: crypto.randomUUID(),
        providerEventId: providerEventId || `evt_${Date.now()}`,
        provider: 'razorpay',
        eventType: event.type,
        payload: event.raw as Prisma.InputJsonValue,
      }
    });

    if (event.type === 'payment.captured') {
      const razorpayOrderId = event.providerOrderId;
      const razorpayPaymentId = event.providerPaymentId;

      if (razorpayOrderId) {
        const fullOrder = await prisma.$transaction(async (tx) => {
          const order = await tx.order.findFirst({
            where: { razorpayOrderId }
          });

          if (order && order.paymentStatus !== 'PAID') {
            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'PAID',
                razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId
              }
            });

            await tx.payment.updateMany({
              where: { providerOrderId: razorpayOrderId },
              data: {
                providerPaymentId: razorpayPaymentId,
                status: 'captured'
              }
            });

            return tx.order.findUnique({
              where: { id: order.id },
              include: { profile: true }
            });
          }
          return null;
        });

        if (fullOrder) {
          try {
            await sendOrderConfirmationEmail(fullOrder);
          } catch (error) {
            console.error('Order confirmation email failed:', error);
          }
        }

      }
    } else if (event.type === 'payment.failed') {
      const razorpayOrderId = event.providerOrderId;
      if (razorpayOrderId) {
        await prisma.payment.updateMany({
          where: { providerOrderId: razorpayOrderId },
          data: { status: 'failed' }
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to Razorpay to prevent retries if it's a processing error, 
    // unless it's a transient DB error.
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}
