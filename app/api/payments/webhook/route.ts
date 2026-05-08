import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymentsService } from '@/lib/payments';
import { sendOrderConfirmationEmail } from '@/lib/email';


export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      event = paymentsService.verifyWebhook(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Store the event for audit purposes
    await prisma.paymentEvent.create({
      data: {
        id: crypto.randomUUID(),
        providerEventId: (event as any).id || `evt_${Date.now()}`,
        provider: 'razorpay',
        eventType: event.event,
        payload: event as any,
      }
    });

    // Process the event
    const payload = (event as any).payload;
    
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const razorpayOrderId = payload.order?.entity?.id || payload.payment?.entity?.order_id;
      const razorpayPaymentId = payload.payment?.entity?.id;

      if (razorpayOrderId) {
        await prisma.$transaction(async (tx) => {
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
            
            // Trigger email notification
            const fullOrder = await tx.order.findUnique({
              where: { id: order.id },
              include: { profile: true }
            });
            if (fullOrder) {
              await sendOrderConfirmationEmail(fullOrder);
            }
          }
        });

      }
    } else if (event.event === 'payment.failed') {
      const razorpayOrderId = payload.payment?.entity?.order_id;
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
