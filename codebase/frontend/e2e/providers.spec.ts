import { test, expect } from '@playwright/test';

test.describe('Provider Catalog & BYOK Key Management Flows', () => {
  test('provider catalog page renders search and billing tier filter', async ({
    page,
  }) => {
    await page.goto('/providers');
    await expect(
      page.getByRole('heading', { name: /Provider Catalog/i }),
    ).toBeVisible();

    const searchInput = page.getByPlaceholder(
      /Search by provider or model name/i,
    );
    await expect(searchInput).toBeVisible();

    const select = page.getByRole('combobox');
    await expect(select).toBeVisible();
    await select.selectOption('user_managed');
  });

  test('settings providers page displays BYOK keys interface and connect modal', async ({
    page,
  }) => {
    await page.goto('/settings/providers');
    await expect(
      page.getByRole('heading', { name: /API Providers & BYOK Keys/i }),
    ).toBeVisible();

    const connectBtn = page.getByRole('button', {
      name: /\+ Connect Provider Key/i,
    });
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Verify modal appears
    await expect(
      page.getByRole('heading', { name: /Connect BYOK Provider Key/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Connection Label/i)).toBeVisible();
    await expect(page.getByLabel(/API Key \/ Secret/i)).toBeVisible();
    await expect(page.getByLabel(/Strict Free-Only Protection/i)).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Cancel/i }).click();
  });
});

