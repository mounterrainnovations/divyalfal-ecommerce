import {
  PaymentsService,
  RazorpayProvider,
} from '@mounterrainnovations/payments';

let cachedPaymentsService: PaymentsService | null = null;

export function getPaymentsService(): PaymentsService {
  if (cachedPaymentsService) {
    return cachedPaymentsService;
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!key_id || !key_secret || !webhook_secret) {
    throw new Error('Razorpay configuration missing');
  }

  const provider = new RazorpayProvider({
    key_id,
    key_secret,
    webhook_secret,
  });

  cachedPaymentsService = new PaymentsService(provider);
  return cachedPaymentsService;
}
