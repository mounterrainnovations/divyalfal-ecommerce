# Code Review Plan: Divyafal Ecommerce Evolution

This document outlines the recommended order and focus areas for a comprehensive review of the new implementations in the `massCode` branch. To ensure a thorough and perfect review, follow the modules in this sequence.

---

## 1. Core Payment Infrastructure

**Files:** `lib/payments.ts`, `package.json`

- **Focus:**
  - Verify the initialization of `PaymentsService` and `RazorpayProvider`.
  - Ensure environment variables are correctly mapped.
  - Check for proper error handling (`SignatureVerificationError`, etc.) as defined in the integration plan.
  - Validate that no direct SDK imports are used outside this service.

## 2. Database Schema

**Files:** `prisma/schema.prisma`

- **Focus:**
  - **Models:** Check for the new `Payment` and `PaymentEvent` models.
  - **Order Types:** Verify the `OrderType` enum (`STANDARD`, `RFQ`) and how it's used in the `Order` model.
  - **Status Transitions:** Check the `OrderStatus` enum (especially `QUOTE_REQUESTED`) and `PaymentStatus`.
  - **Relationships:** Ensure foreign key relationships between Orders and Payments are correct.
  - **Types & Accuracy:** Ensure field types (like `Int` for amounts in paise) match the payment service requirements.
  - **Indexes:** Check for indexes on `providerOrderId` and `providerEventId` for performance and idempotency.

## 3. Authentication & Security (incl. Ghost Flow)

**Files:** `lib/auth-utils.ts`, `app/checkout/auth/page.tsx`, `app/api/checkout/route.ts`

- **Focus:**
  - **Ghost Booking:** Verify the logic for "Checkout as Guest". Ensure guest details (email, phone, name) are correctly captured and persisted in the `Order` model.
  - **Authenticated Flow:** Review the transition from guest to authenticated user if they log in mid-flow.
  - **Security:** Ensure secure handling of user sessions and that sensitive tokens are not exposed.
  - **Permissions:** Verify that guest users cannot access restricted order details after the session expires.

## 4. Backend: Order Creation (Checkout API)

**Files:** `app/api/checkout/route.ts`

- **Focus:**
  - **Inventory Locking:** Ensure stock is reserved when an order is created to prevent overselling.
  - **Transaction Integrity:** Verify that the Order and initial Payment record are created within a single database transaction.
  - **Amount Calculation:** Validate that the server-side amount calculation matches the items in the cart (never trust the frontend amount).

## 5. Backend: Payment Verification & Webhooks

**Files:** `app/api/payments/verify/route.ts`, `app/api/payments/webhook/route.ts`

- **Focus:**
  - **Verify Route:** Ensure HMAC signature verification is robust. Check for `verifyAndFetchCheckoutPayment` usage.
  - **Webhook Handler:**
    - **Idempotency:** Verify that the same event ID isn't processed twice using the `PaymentEvent` table.
    - **State Machine:** Ensure payment status transitions are legal (e.g., `created` -> `captured`).
    - **Raw Body:** Confirm the webhook route uses the raw request body for signature verification.

## 6. Frontend: Cart & State Management

**Files:** `lib/store/cart.ts`, `app/cart/page.tsx`

- **Focus:**
  - Review the Zustand store for persistence and hydration issues.
  - Ensure cart totals are calculated correctly.
  - Verify that the cart is cleared only AFTER a successful payment verification.

## 7. Frontend: Checkout Workflow

**Files:** `app/checkout/address/page.tsx`, `app/checkout/review/page.tsx`

- **Focus:**
  - **User Experience:** Smooth transitions between address selection and order review.
  - **Razorpay Integration:** Verify the frontend `Razorpay` checkout modal configuration.
  - **Data Pre-validation:** Ensure all required data is present before calling the checkout API.

## 8. Vendor Dashboard: Order & RFQ Management

**Files:** `app/dashboard/orders/page.tsx`, `app/dashboard/orders/[id]/page.tsx`, `app/api/orders/[id]/route.ts`

- **Focus:**
  - **RFQ Lifecycle:**
    - **Request:** Verify the status `QUOTE_REQUESTED` is correctly handled.
    - **Response:** Review how vendors respond to quotes (e.g., updating price or sending custom payment links).
    - **Notifications:** Confirm vendors are notified of new RFQs immediately.
  - **Admin Visibility:** Ensure admins can see payment status, provider IDs, and order types for all users (Auth & Ghost).
  - **Manual Overrides:** Check for the implementation of admin manual payment marking.
  - **Data Integrity:** Ensure order details and line items (including custom measurements) are rendered correctly.

## 9. Vendor Dashboard: Product & Inventory Management

**Files:** `app/dashboard/products/page.tsx`, `app/api/products/route.ts`, `app/api/products/[id]/route.ts`

- **Focus:**
  - **CRUD Operations:** Review the ability for vendors to add, edit, and delete products.
  - **Inventory Management:** Ensure stock levels (increase/decrease) are updated correctly and reflect in real-time on the frontend.
  - **Variant Control:** Verify that size/color variants can be managed per product.
  - **Archival:** Check the "isArchived" logic to ensure deleted products don't break existing orders.

## 9. Automation & Maintenance

**Files:** `app/api/cron/cleanup-stock/route.ts`

- **Focus:**
  - **Stock Recovery:** Ensure stock is correctly incremented back if an order expires without payment.
  - **Efficiency:** Verify the query for "expired" orders is performant.
  - **Safety:** Ensure it doesn't accidentally cancel paid orders.

## 10. Communication & Notifications

**Files:** `lib/email.ts`

- **Focus:**
  - Review email templates for Order Confirmation and RFQ Alerts.
  - Ensure asynchronous sending to prevent blocking the main request flow.
  - Verify error handling for failed email deliveries.

---

## Review Completion Checklist

- [ ] No race conditions in inventory management.
- [ ] Payment webhooks are idempotent.
- [ ] Server-side amount validation is strictly enforced.
- [ ] Admin dashboard reflects real-time payment status.
- [ ] Cron job safely recovers stock for abandoned carts.
