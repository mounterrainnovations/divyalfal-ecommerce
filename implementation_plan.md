# Admin Dashboard Fixes & Feature Enhancements (Revised)

This comprehensive plan ensures total synchronization between admin capabilities and frontend UI representations. Everything configured by the admin will be fully interactive and accurately displayed to the user.

## Proposed Changes

---

### Phase 1: End-to-End Image & Cropping Synchronization
The admin must be able to upload multiple images, crop them to highlight specific details, and have the frontend flawlessly render this exact gallery.

#### [MODIFY] `app/dashboard/products/page.tsx`
- **Multiple Image Upload with Cropper**: We will integrate `react-image-crop`. When the admin selects an image, a beautifully designed crop modal will appear allowing them to zoom/crop the image before it uploads.
- **Photos Array Support**: Instead of a single `image` field, the form will manage a `photos` array (up to 4-5 images). The admin can reorder or remove these images.

#### [MODIFY] `components/features/products/product-hero.tsx` (Verification)
- This component already uses `photos: string[]`. We will verify it perfectly handles the cropped aspect ratios and gracefully falls back to placeholders if the admin hasn't added images.

---

### Phase 2: Rich Text Description Sync
The "Garment Description" must allow detailed markdown formatting, ensuring what the admin types is exactly what the user reads, without breaking other UI components (like the "All Products" list).

#### [MODIFY] `app/dashboard/products/page.tsx`
- Replace the raw `<textarea>` with the existing `RichTextEditor` (Tiptap-based) component for the product description field.

#### [MODIFY] `components/features/products/product-details.tsx` (Verification)
- The component already renders `dangerouslySetInnerHTML`. We will ensure standard typography classes (`prose prose-gray`) accurately map the Tiptap HTML output into a premium reading experience. 

---

### Phase 3: Total Variant & Stock Control Synchronization
Admin needs granular control over product variants, and the frontend needs to strictly respect these configurations to prevent "Variant not found" or "Out of Stock" checkout errors.

#### [MODIFY] `app/dashboard/products/page.tsx`
- **Admin Variant UI**: Introduce a dedicated "Variants & Stock" section inside the "Add/Edit Product" modal.
- The admin can dynamically add variants (e.g., Size: 'S', Color: 'Red', Stock: 10), delete variants, and toggle products as "Paused/Archived".

#### [MODIFY] `app/api/products/[id]/route.ts` & `app/api/products/route.ts`
- Extend the `POST` and `PATCH` endpoints to explicitly receive the `variants` array. It will use Prisma transactions to delete old variants and insert the newly configured ones, keeping the database in perfect sync with the admin UI.

#### [MODIFY] `components/features/products/product-details.tsx`
- The size selector will dynamically map over the precise variants saved by the admin.
- It will enforce stock limits and prevent users from selecting sizes that are "Out of Stock" (or change the button to "Out of Stock").

---

### Phase 4: Request for Quote (RFQ) Immediate Flow
Instead of burying the RFQ option at the end of the standard checkout, we will bring it to the forefront so users can instantly request custom pricing or details.

#### [MODIFY] `components/features/products/product-details.tsx`
- Add a prominent **"Request Quote"** button next to "Add to Cart".

#### [MODIFY] `app/checkout/rfq/page.tsx` (New Route)
- Create a dedicated RFQ checkout route. When "Request Quote" is clicked, the user is navigated here directly.
- It will prompt the user to "Continue as Guest" or "Sign In" (fulfilling the specific request for guest/auth handling). 
- It captures their contact/shipping details and submits the RFQ, skipping the standard cart payment gateway entirely.

---

### Phase 5: Aesthetic Modals & Toasts
Replacing clunky browser defaults with beautifully designed UI elements.

#### [MODIFY] `app/dashboard/products/page.tsx` & Global Forms
- Replace `alert(...)` with the newly installed `sonner` toast notifications.
- Replace `confirm(...)` with a custom-built, center-screen `AlertModal`.

#### [NEW] `components/ui/alert-modal.tsx`
- A premium, centered "Yes/No" dialog for destructive admin actions (like deleting a product or variant).

---

## Verification Plan

### Automated/Local Tests
- Create a product, crop 3 different images, format the description with lists and bold text, and assign specific stock to 'M' and 'L' sizes only.
- Validate that the frontend strictly shows 'M' and 'L' sizes and respects the formatted description.
- Attempt guest checkout with an RFQ to verify the new standalone RFQ pipeline securely handles the request without stock errors.
- Ensure all mock testing avoids specific names like "Pranav Nair".

## User Review Required
> [!IMPORTANT]
> The RFQ flow will now be a direct checkout process decoupled from the main cart. The user will click "Request Quote" on the product page and instantly be asked for guest/auth details to finalize the quote. Does this align with your vision for the "Request for code (quote) flow"?
