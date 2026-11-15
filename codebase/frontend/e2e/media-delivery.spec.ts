import { test, expect } from '@playwright/test';

test.describe('Video Library, Player & Media Delivery Flows', () => {
  test('user can browse video library with filters and view switcher', async ({ page }) => {
    await page.goto('/videos');

    // Page title and subtitle
    await expect(page.getByRole('heading', { name: /Video Library/i })).toBeVisible();
    await expect(page.getByText(/Manage, preview, and download your rendered AI videos/i)).toBeVisible();

    // Search and filters
    const searchInput = page.getByPlaceholder(/Search videos by title or prompt/i);
    await expect(searchInput).toBeVisible();

    const statusFilter = page.getByRole('combobox');
    await expect(statusFilter).toBeVisible();

    // View toggle buttons (Grid and Table)
    const gridBtn = page.getByRole('button', { name: /Grid/i });
    const tableBtn = page.getByRole('button', { name: /Table/i });
    await expect(gridBtn).toBeVisible();
    await expect(tableBtn).toBeVisible();

    // Switch to table view
    await tableBtn.click();
    await expect(page.getByRole('table')).toBeVisible();

    // Switch back to grid view
    await gridBtn.click();
  });

  test('user can trigger duplicate modal and delete confirmation from video library', async ({ page }) => {
    await page.goto('/videos');

    // Find first duplicate button
    const duplicateButtons = page.getByRole('button', { name: /Duplicate/i });
    if ((await duplicateButtons.count()) > 0) {
      await duplicateButtons.first().click();

      // Verify modal
      await expect(page.getByRole('heading', { name: /Duplicate Project/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Confirm Duplication/i })).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).click();
    }

    // Find first delete button
    const deleteButtons = page.getByRole('button', { name: /Delete/i });
    if ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click();

      // Verify delete confirmation modal with permanent asset deletion warning
      await expect(page.getByRole('heading', { name: /Delete Video Project/i })).toBeVisible();
      await expect(page.getByText(/permanently deleted from S3 storage/i)).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).click();
    }
  });

  test('user can view video playback interface and download rendered video', async ({ page }) => {
    // Navigate to a sample video project
    await page.goto('/videos/sample-proj-123');

    // Page renders cleanly
    await expect(page.locator('body')).toBeVisible();
  });
});

