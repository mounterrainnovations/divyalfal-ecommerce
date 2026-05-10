
declare module '@mounterrainnovations/payments' {
  export interface CreateOrderResult {
    providerOrderId: string;
    amount: number;
    currency: string;
    receipt?: string;
    raw?: unknown;
  }

  export interface PaymentDetails {
    providerPaymentId: string;
    providerOrderId?: string;
    amount: number;
    currency: string;
    status: string;
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
