import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Flow', () => {
  const adminEmail = 'Divyafalthecreations@gmail.com';
  const adminPassword = 'DivyafalSeason@4';

  test.beforeEach(async ({ page }) => {
    // 1. Admin Login
    await page.goto('/login');
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Perform Product CRUD Operations', async ({ page }) => {
    // 2. Navigate to Inventory
    await page.goto('/dashboard/products');
    await expect(page.locator('h1')).toHaveText('Inventory');
    
    // 3. Add New Product
    await page.click('button:has-text("Add Product")');
    await expect(page.locator('text=Add New Collection Item')).toBeVisible();
    
    const productName = `E2E Test Product ${Date.now()}`;
    await page.fill('#name', productName);
    await page.fill('#price', '9999');
    await page.selectOption('#category', 'SAREE');
    await page.fill('#description', 'This is an E2E test product created by an automated test bot.');
    // Optional: Add image URL if needed
    
    await page.click('button:has-text("Create Garment")');
    
    // 4. Verify Creation (Search for the product)
    await page.fill('input[placeholder="Search by name or ID..."]', productName);
    await page.press('input[placeholder="Search by name or ID..."]', 'Enter');
    
    await expect(page.locator(`text=${productName}`)).toBeVisible();
    
    // 5. Edit Product
    await page.click('button:has(svg.lucide-edit)');
    await expect(page.locator('text=Edit Boutique Item')).toBeVisible();
    
    await page.fill('#name', `${productName} (Updated)`);
    await page.click('button:has-text("Update Garment")');
    
    await expect(page.locator(`text=${productName} (Updated)`)).toBeVisible();
    
    // 6. Delete Product
    page.once('dialog', dialog => dialog.accept().catch(() => {}));
    await page.click('button:has(svg.lucide-trash2)');
    
    // Verify it's gone from search (after refetching)
    await expect(page.locator(`text=${productName} (Updated)`)).not.toBeVisible();
  });

  test('Order Monitoring and Status Update in Admin', async ({ page }) => {
    // 7. Navigate to Orders
    await page.goto('/dashboard/orders');
    await expect(page.locator('h1')).toHaveText('Orders');
    
    // 8. View first order
    const firstOrderRow = page.locator('table tbody tr').first();
    const orderId = await firstOrderRow.locator('td').first().textContent();
    console.log('Testing with Order:', orderId);
    
    await firstOrderRow.locator('button:has(svg.lucide-chevron-right)').click();
    await expect(page).toHaveURL(/.*\/dashboard\/orders\/.*/);

    // 9. Update Status
    await page.selectOption('#status', 'SHIPPED');
    await page.fill('#trackingId', 'E2E-TRACK-12345');
    await page.fill('#trackingUrl', 'https://track.example.com/E2E-TRACK-12345');
    
    await page.click('button:has-text("Save Changes")');
    
    // Verify success message
    await expect(page.locator('text=Order updated successfully')).toBeVisible();
    
    // Verify persistence after refresh
    await page.reload();
    await expect(page.locator('#status')).toHaveValue('SHIPPED');
    await expect(page.locator('#trackingId')).toHaveValue('E2E-TRACK-12345');
  });
});
