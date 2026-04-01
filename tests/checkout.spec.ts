import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  const adminEmail = 'Divyafalthecreations@gmail.com';
  const adminPassword = 'DivyafalSeason@4';

  test('Perform full checkout as authenticated user', async ({ page }) => {
    // 1. Login first to avoid redirect interruptions
    await page.goto('/login');
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Add product to cart
    await page.goto('/products');
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.click();
    
    // Handle "Added to cart" alert
    page.once('dialog', dialog => dialog.dismiss().catch(() => {}));
    await page.click('button:has-text("Add to Cart")');
    
    // 3. Go to Cart then Checkout
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');
    await expect(page).toHaveURL(/\/checkout\/address/);

    // 4. Fill Address
    await page.fill('#fullName', 'Test Admin');
    await page.fill('#email', adminEmail);
    await page.fill('#phone', '9876543210');
    await page.fill('#street', '123 E2E Street');
    await page.fill('#city', 'Mumbai');
    await page.fill('#state', 'Maharashtra');
    await page.fill('#postalCode', '400001');
    
    await page.click('button:has-text("Continue to Review")');
    await expect(page).toHaveURL(/\/checkout\/review/);

    // 5. Place Order
    await page.click('button:has-text("Place Order securely")');
    
    // 6. Verify Success
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.locator('text=Order Successful')).toBeVisible() || await expect(page.locator('text=Thank you')).toBeVisible();
    
    const orderIdText = await page.locator('text=/Order ID: #?[A-Z0-9-]+/i').textContent();
    console.log('Created Order:', orderIdText);
  });
});
