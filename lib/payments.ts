import {
  PaymentsService,
  RazorpayProvider,
} from '@mounterrainnovations/payments';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;
const webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!key_id || !key_secret || !webhook_secret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Razorpay configuration missing in production');
  } else {
    console.warn('Razorpay configuration missing. Payment service will not function correctly.');
  }
}

const provider = new RazorpayProvider({
  key_id: key_id || 'placeholder',
  key_secret: key_secret || 'placeholder',
  webhook_secret: webhook_secret || 'placeholder',
});

export const paymentsService = new PaymentsService(provider);
