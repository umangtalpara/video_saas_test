import { test, expect } from '@playwright/test';

test.describe('Video Creation Wizard & Script Review Flows', () => {
  test('user can walk through wizard steps and see script preview', async ({
    page,
  }) => {
    await page.goto('/videos/new');
    await expect(
      page.getByRole('heading', { name: /Create New AI Video/i }),
    ).toBeVisible();

    // Check Step 1 prompt textarea
    const promptInput = page.getByPlaceholder(
      /Describe your story or video in detail/i,
    );
    await expect(promptInput).toBeVisible();
    await promptInput.fill(
      'Cinematic exploration of ancient underwater ruins in the Pacific ocean',
    );

    // Continue to Step 2
    await page.getByRole('button', { name: /Continue →/i }).click();

    // Step 2 format
    await expect(page.getByText(/Target Duration/i)).toBeVisible();
    await expect(page.getByText(/Aspect Ratio/i)).toBeVisible();
    await page.getByRole('button', { name: /Continue →/i }).click();

    // Step 3 provider selection
    await expect(page.getByText(/Video Generation Provider/i)).toBeVisible();
    await page.getByRole('button', { name: /Continue →/i }).click();

    // Step 4 review summary
    await expect(page.getByText(/Configuration Summary/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Generate Video Script/i }),
    ).toBeVisible();
  });
});

