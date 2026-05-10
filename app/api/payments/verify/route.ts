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

    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    try {
      await paymentsService.verifyAndFetchCheckoutPayment({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        expectedAmount: Math.round(Number(order.totalAmount) * 100),
        expectedCurrency: 'INR',
      });
    } catch (error) {
      console.error('Invalid Razorpay signature or mismatched payment:', error);
      return NextResponse.json({ error: 'Invalid payment verification' }, { status: 400 });
    }

    // Update order and payment record in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      
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

      return tx.order.findUnique({
        where: { id: order.id },
        include: { profile: true }
      });
    });

    if (updatedOrder) {
      try {
        await sendOrderConfirmationEmail(updatedOrder);
      } catch (error) {
        console.error('Order confirmation email failed:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', message: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
