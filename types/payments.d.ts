
declare module '@mounterrainnovations/payments' {
  export type PaymentStatus =
    | 'created'
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'partially_refunded'
    | 'refunded';

  export interface CreateOrderResult {
    providerOrderId: string;
    amount: number;
    currency: string;
    receipt?: string;
    raw?: unknown;
  }

  export interface PaymentDetails {
    providerPaymentId: string;
    providerOrderId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    method?: string;
    email?: string;
    contact?: string;
    notes?: Record<string, string>;
    createdAt: Date;
    raw?: unknown;
  }

  export interface OrderDetails {
    providerOrderId: string;
    amount: number;
    currency: string;
    receipt?: string;
    status: string;
    createdAt: Date;
    raw?: unknown;
  }

  export interface PaymentEvent {
    type: string;
    provider: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    providerRefundId?: string;
    amount?: number;
    currency?: string;
    raw: unknown;
  }

  export class RazorpayProvider {
    constructor(config: {
      key_id: string;
      key_secret: string;
      webhook_secret: string;
    });
  }

  export class PaymentsService {
    constructor(provider: unknown);
    createOrder(data: {
      amount: number;
      currency: string;
      receipt: string;
      notes?: Record<string, string>;
    }): Promise<CreateOrderResult>;
    fetchOrder(orderId: string): Promise<OrderDetails>;
    fetchOrderPayments(orderId: string): Promise<PaymentDetails[]>;
    fetchPayment(paymentId: string): Promise<PaymentDetails>;
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
    verifyAndFetchCheckoutPayment(data: {
      orderId: string;
      paymentId: string;
      signature: string;
      expectedAmount?: number;
      expectedCurrency?: string;
      requireOrderMatch?: boolean;
    }): Promise<PaymentDetails>;
    processWebhook(rawBody: string, signature: string, providerEventId?: string): Promise<PaymentEvent>;
  }
}
