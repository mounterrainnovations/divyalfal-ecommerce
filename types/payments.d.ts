
declare module '@mounterrainnovations/payments' {
  export class RazorpayProvider {
    constructor(config: {
      key_id: string;
      key_secret: string;
      webhook_secret: string;
    });
  }

  export class PaymentsService {
    constructor(provider: any);
    createOrder(data: {
      amount: number;
      currency: string;
      receipt: string;
      notes?: Record<string, string>;
    }): Promise<any>;
    verifyPayment(data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }): Promise<boolean>;
    verifyWebhook(body: string, signature: string): any;
    constructEvent(payload: string, signature: string, secret: string): any;
  }
}
