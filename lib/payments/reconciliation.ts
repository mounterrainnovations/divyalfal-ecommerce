import { prisma } from '@/lib/db';
import { paymentsService } from '@/lib/payments';
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';

// Using local type since library types might be missing in some environments
type GatewayPaymentStatus = 
  | "created"
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "partially_refunded"
  | "refunded";

type ReconcilableOrder = {
  id: string;
  profileId: string | null;
  totalAmount: unknown;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  razorpayOrderId: string | null;
};

export type ReconciliationOutcome =
  | 'already_paid'
  | 'paid_reconciled'
  | 'authorized_pending'
  | 'failed_pending'
  | 'no_remote_payment'
  | 'missing_provider_order'
  | 'error';

export interface ReconciliationResult {
  orderId: string;
  razorpayOrderId: string | null;
  outcome: ReconciliationOutcome;
  paymentId?: string;
  message?: string;
}

function selectBestPayment(
  payments: Array<{
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    status: GatewayPaymentStatus;
    currency: string;
    createdAt: Date;
  }>,
  expectedAmount: number
) {
  const exactAmountPayments = payments.filter((payment) => payment.amount === expectedAmount);
  const relevantPayments = exactAmountPayments.length > 0 ? exactAmountPayments : payments;

  const sortNewestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) =>
    b.createdAt.getTime() - a.createdAt.getTime();

  const captured = relevantPayments
    .filter((payment) => payment.status === 'captured')
    .sort(sortNewestFirst)[0];

  if (captured) {
    return captured;
  }

  const authorized = relevantPayments
    .filter((payment) => payment.status === 'authorized')
    .sort(sortNewestFirst)[0];

  if (authorized) {
    return authorized;
  }

  const failed = relevantPayments
    .filter((payment) => payment.status === 'failed')
    .sort(sortNewestFirst)[0];

  if (failed) {
    return failed;
  }

  return relevantPayments.sort(sortNewestFirst)[0] || null;
}

async function persistGatewayPaymentState(
  order: ReconcilableOrder,
  payment: {
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    status: GatewayPaymentStatus;
    currency: string;
  }
) {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { providerOrderId: payment.providerOrderId },
      update: {
        providerPaymentId: payment.providerPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      create: {
        id: crypto.randomUUID(),
        orderId: order.id,
        profileId: order.profileId,
        providerOrderId: payment.providerOrderId,
        providerPaymentId: payment.providerPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    });

    if (payment.status !== 'captured') {
      return null;
    }

    const currentOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: { profile: true },
    });

    if (!currentOrder || currentOrder.paymentStatus === 'PAID') {
      return null;
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        razorpayPaymentId: payment.providerPaymentId,
      },
      include: { profile: true },
    });
  });

  if (updatedOrder) {
    try {
      await sendOrderConfirmationEmail(updatedOrder);
    } catch (error) {
      console.error('Order confirmation email failed during reconciliation:', error);
    }
  }

  return updatedOrder;
}

export async function reconcileOrderPayment(
  order: ReconcilableOrder
): Promise<ReconciliationResult> {
  if (!order.razorpayOrderId) {
    return {
      orderId: order.id,
      razorpayOrderId: null,
      outcome: 'missing_provider_order',
      message: 'Order does not have a Razorpay order ID',
    };
  }

  if (order.paymentStatus === 'PAID') {
    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      outcome: 'already_paid',
    };
  }

  try {
    const expectedAmount = Math.round(Number(order.totalAmount) * 100);
    const payments = await (paymentsService as any).fetchOrderPayments(order.razorpayOrderId);

    if (payments.length === 0) {
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        outcome: 'no_remote_payment',
      };
    }

    const selectedPayment = selectBestPayment(payments, expectedAmount);
    if (!selectedPayment) {
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        outcome: 'no_remote_payment',
      };
    }

    await persistGatewayPaymentState(order, selectedPayment);

    if (selectedPayment.status === 'captured') {
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        outcome: 'paid_reconciled',
        paymentId: selectedPayment.providerPaymentId,
      };
    }

    if (selectedPayment.status === 'authorized') {
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        outcome: 'authorized_pending',
        paymentId: selectedPayment.providerPaymentId,
      };
    }

    if (selectedPayment.status === 'failed') {
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        outcome: 'failed_pending',
        paymentId: selectedPayment.providerPaymentId,
      };
    }

    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      outcome: 'no_remote_payment',
      paymentId: selectedPayment.providerPaymentId,
      message: `Unhandled gateway payment status: ${selectedPayment.status}`,
    };
  } catch (error) {
    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      outcome: 'error',
      message: error instanceof Error ? error.message : 'Unknown reconciliation error',
    };
  }
}
