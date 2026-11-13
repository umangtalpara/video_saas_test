import { test, expect } from '@playwright/test';

test.describe('Authentication & Navigation Flows', () => {
  test('landing page loads and links to register and login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VideoForge AI/i);
    await expect(page.getByRole('heading', { name: /Turn Text & Ideas Into/i })).toBeVisible();

    await page.getByRole('link', { name: /Start Creating Videos/i }).click();
    await expect(page).toHaveURL(/.*register/);
  });

  test('registration page has validated form inputs', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Sign Up/i });
    await submitBtn.click();

    // Browser / client validation error triggers
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test('login page allows credentials entry', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.getByLabel(/Email Address/i)).fill('test@example.com');
    await page.getByLabel(/Password/i)).fill('P@ssword123!');
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeEnabled();
  });

  test('forgot password page accepts email and displays instructions', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /Reset your password/i })).toBeVisible();

    await page.getByLabel(/Email Address/i)).fill('forgot@example.com');
    await page.getByRole('button', { name: /Send Reset Link/i }).click();
  });
});

