import { test, expect } from '@playwright/test';

test.describe('Cart & Product Flow', () => {
  test('Add product to cart and manage quantity', async ({ page }) => {
    // 1. Navigate to products listing
    await page.goto('/products');
    
    // 2. Click on the first product link
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    
    // 3. Wait for product detail page
    await expect(page).toHaveURL(/\/product\//);
    
    // 4. Select a size (if available) - Look for buttons that look like sizes (S, M, L, etc.)
    const sizeButtons = page.locator('button:has-text("S"), button:has-text("M"), button:has-text("L"), button:has-text("XL"), button:has-text("One Size")');
    if (await sizeButtons.count() > 0) {
        await sizeButtons.first().click();
    }
    
    // 5. Add to cart
    // Note: The app uses window.alert for "Added to cart!"
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Added to cart');
      dialog.dismiss().catch(() => {});
    });
    
    await page.click('button:has-text("Add to Cart")');
    
    // 6. Navigate to cart
    await page.goto('/cart');
    
    // 7. Verify item is in cart
    await expect(page.locator('h1')).toHaveText('Your Shopping Cart');
    await expect(page.locator('button[title="Remove item"]')).toBeVisible();
    
    // 8. Update quantity (Increment)
    const initialItemsCount = await page.locator('text=/Subtotal \\(\\d+ items\\)/').textContent();
    await page.locator('button:has(svg.lucide-plus)').first().click();
    
    // 9. Verify quantity updated (Wait for the text to change)
    await expect(page.locator('text=/Subtotal \\(\\d+ items\\)/')).not.toHaveText(initialItemsCount || '');
    
    // 10. Remove item
    await page.click('button[title="Remove item"]');
    
    // 11. Verify cart is empty
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });
});
