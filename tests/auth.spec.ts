import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testUser = {
    fullName: 'Test User',
    email: `testuser-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  test('Signup flow should redirect to login with success message', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('#fullName', testUser.fullName);
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    
    await page.click('button:has-text("Create Account")');
    
    // Verify redirection to login with message
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.locator('text=Check your email to confirm your account')).toBeVisible();
  });

  test('Login and Logout flow for Admin', async ({ page }) => {
    const adminEmail = 'Divyafalthecreations@gmail.com';
    const adminPassword = 'DivyafalSeason@4';

    await page.goto('/login');
    
    await page.fill('#email', adminEmail);
    await page.fill('#password', adminPassword);
    
    await page.click('button:has-text("Sign In")');
    
    // Check for error message if still on login page
    if (page.url().includes('/login')) {
        const errorMessage = await page.locator('.bg-red-50').textContent().catch(() => 'No error message found');
        console.error('Login Failed with error:', errorMessage);
    }

    // Admin should be redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Overview')).toBeVisible();
    
    // Test logout
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL(/\/login/);
  });
});
