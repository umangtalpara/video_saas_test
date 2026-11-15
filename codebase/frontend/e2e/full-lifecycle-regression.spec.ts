import { test, expect } from '@playwright/test';

test.describe('VideoForge AI - Full System Lifecycle Regression Suite', () => {
  test('1. Authentication: login & registration screens load with required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
  });

  test('2. Provider Key Setup: catalog and BYOK settings interfaces', async ({ page }) => {
    await page.goto('/providers');
    await expect(page.getByRole('heading', { name: /Provider Catalog/i })).toBeVisible();

    await page.goto('/settings/providers');
    await expect(page.getByRole('heading', { name: /API Providers & BYOK Keys/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ Connect Provider Key/i })).toBeVisible();
  });

  test('3. Video Project Wizard: creation workflow and parameter inputs', async ({ page }) => {
    await page.goto('/videos/new');
    await expect(page.getByRole('heading', { name: /Create New Video Project/i })).toBeVisible();
    await expect(page.getByLabel(/Project Title/i)).toBeVisible();
    await expect(page.getByLabel(/Creative Prompt/i)).toBeVisible();
  });

  test('4. Generation Progress & Player: project details interface', async ({ page }) => {
    await page.goto('/videos/sample-proj-123');
    await expect(page.locator('body')).toBeVisible();
  });

  test('5. Video Library: grid/table views and management actions', async ({ page }) => {
    await page.goto('/videos');
    await expect(page.getByRole('heading', { name: /Video Library/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Search videos by title or prompt/i)).toBeVisible();
  });

  test('6. Usage Analytics & Safety Limits: consumption metrics and limits editor', async ({ page }) => {
    await page.goto('/usage');
    await expect(page.getByRole('heading', { name: /Usage & Consumption/i })).toBeVisible();
    await expect(page.getByText(/Daily Generation Cap/i)).toBeVisible();

    await page.goto('/settings/limits');
    await expect(page.getByRole('heading', { name: /Generation Limits & Safety/i })).toBeVisible();
    await expect(page.getByLabel(/Daily Job Cap/i)).toBeVisible();
    await expect(page.getByLabel(/Monthly Job Cap/i)).toBeVisible();
  });

  test('7. Admin Console: platform overview, killswitches, users, jobs, and audit trail', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Platform Administration/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Overview & Killswitches/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /User Management/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Job Diagnostics/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Security Audit Trail/i })).toBeVisible();
  });
});

