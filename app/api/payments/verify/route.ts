import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { paymentsService } from '@/lib/payments';
import { sendOrderConfirmationEmail } from '@/lib/email';


export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    const isValid = paymentsService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error('Invalid Razorpay signature for order:', razorpay_order_id);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Update order and payment record in a transaction
    await prisma.$transaction(async (tx) => {
      // Find the order first to ensure it exists
      const order = await tx.order.findFirst({
        where: { razorpayOrderId: razorpay_order_id }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          razorpayPaymentId: razorpay_payment_id
        }
      });

      await tx.payment.update({
        where: { providerOrderId: razorpay_order_id },
        data: {
          providerPaymentId: razorpay_payment_id,
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
    });


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', message: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
