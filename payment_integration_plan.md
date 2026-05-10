# Master Integration Guide: @mounterrainnovations/payments

**Target Audience:** AI Coding Agents & Backend Developers.
This guide provides everything needed to integrate the Mounterra Payment Infrastructure package into a primary application repo.

---

## 1. Installation

Run the following command to install the package and its peer dependency:

```bash
npm install @mounterrainnovations/payments razorpay
```

---

## 2. Environment Configuration

Add the following keys to your `.env` file. These must be provided to the package during initialization.

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

---

## 3. Framework Integration

### Option A: NestJS (Recommended)

1. **Module Registration**: Import `PaymentsModule` in your `AppModule`.

```typescript
import { PaymentsModule } from '@mounterrainnovations/payments/dist/adapters/nest/payments.module';

@Module({
  imports: [
    PaymentsModule.register({
      razorpay: {
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
        webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET!,
      },
      // Optional: idempotency: myCustomIdempotencyService
    }),
  ],
})
export class AppModule {}
```

2. **Controller/Service Usage**: Inject `PaymentsNestService`.

```typescript
import { PaymentsNestService } from '@mounterrainnovations/payments/dist/adapters/nest/payments.service';

@Injectable()
export class CheckoutService {
  constructor(private payments: PaymentsNestService) {}

  async createCheckout(amount: number) {
    const order = await this.payments.createOrder({
      amount, // in paise (e.g., 50000 for ₹500)
      currency: 'INR',
      receipt: `order_rcpt_${Date.now()}`,
    });
    // SAVE order.providerOrderId to your DB payments table here
    return order;
  }
}
```

3. **Webhook Setup**: In `main.ts`, ensure raw body parsing is enabled for the webhook route.

```typescript
// main.ts
import * as express from 'express';
// ...
app.use('/payments/webhook', express.raw({ type: 'application/json' }));
```

---

### Option B: Serverless (Next.js / Vercel)

Instantiate the service and handlers manually:

```typescript
import {
  createPaymentHandlers,
  PaymentsService,
  RazorpayProvider,
} from '@mounterrainnovations/payments';

const provider = new RazorpayProvider({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET!,
});

const paymentsService = new PaymentsService(provider);

// Export handlers for your API routes
export const {
  createOrderHandler,
  verifyCheckoutPaymentHandler, // Recommended for secure checkout success
  webhookHandler,
} = createPaymentHandlers(paymentsService);
```

---

## 4. Core Workflow & Security

### Secure Checkout Verification

After a user completes payment on the frontend, DO NOT rely on the frontend response. Use `verifyAndFetchCheckoutPayment` to verify the HMAC and assert payment details (amount/currency) on the server.

```typescript
const details = await payments.verifyAndFetchCheckoutPayment({
  orderId: body.razorpay_order_id,
  paymentId: body.razorpay_payment_id,
  signature: body.razorpay_signature,
  expectedAmount: 50000, // Optional: assert amount matches
  expectedCurrency: 'INR', // Optional: assert currency matches
});

// If no error is thrown, the payment is verified.
// You can now check details.status (e.g., "captured" or "authorized")
```

### Webhook Processing

Webhooks are the **source of truth** for payment status updates.

```typescript
const event = await payments.processWebhook(rawBody, signature);

switch (event.type) {
  case 'payment.captured':
    // Update DB: status = 'captured', providerPaymentId = event.providerPaymentId
    break;
  case 'partial_refund.processed':
    // Update DB: status = 'partially_refunded'
    break;
  case 'refund.processed':
    // Update DB: status = 'refunded'
    break;
}
```

---

## 5. Recommended Database Schema (Supabase/Postgres)

The library is provider-agnostic and does not write to your DB. We recommend the following schema for your application:

### Table: `payments`

```sql
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL, -- e.g., 'razorpay'
  provider_order_id text UNIQUE NOT NULL,
  provider_payment_id text,
  amount integer NOT NULL, -- minor units
  currency text NOT NULL,
  status text NOT NULL, -- created, authorized, captured, refunded, etc.
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Table: `payment_events` (Idempotency)

```sql
CREATE TABLE public.payment_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_event_id text UNIQUE NOT NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz DEFAULT now()
);
```

---

## 6. Error Handling

Handle specific errors exported by the library:

- `SignatureVerificationError`: Thrown when HMAC verification fails.
- `PaymentVerificationMismatchError`: Thrown when amount/currency doesn't match expectations.
- `ProviderError`: Gateway-specific errors (contains raw error from SDK).
- `InvalidPaymentTransitionError`: Thrown by the state machine on illegal state changes.

---

## 7. Guardrails (CRITICAL)

1. **Raw Body**: Always pass the **raw, un-parsed** request body string for webhook verification.
2. **State Machine**: Never update payment statuses to arbitrary strings. Use the library's `PaymentStatus` type.
3. **Idempotency**: Use `Idempotency-Key` headers or `provider_event_id` for all state-changing operations.
4. **No Direct SDKs**: The consuming app should NEVER import `razorpay` directly. Use `PaymentsService`.
