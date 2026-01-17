/**
 * Terminal E2E Tests
 * Phase 3.2: Critical path tests for terminal functionality
 */

import { test, expect, waitForTerminalReady, selectProject } from './fixtures/auth.js';

test.describe('Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });
  });

  test('should display terminal when project selected', async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForTimeout(1000);

    // Check if there are projects in the sidebar
    const projectItems = page.locator('[class*="sidebar"] button').filter({ hasText: /.+/ });
    const count = await projectItems.count();

    if (count > 0) {
      // Click first project
      await projectItems.first().click();

      // Terminal should appear
      await expect(page.locator('[class*="xterm"]')).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'No projects available for testing');
    }
  });

  test('should handle terminal resize', async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForTimeout(1000);

    const projectItems = page.locator('[class*="sidebar"] button').filter({ hasText: /.+/ });
    const count = await projectItems.count();

    if (count > 0) {
      await projectItems.first().click();
      await expect(page.locator('[class*="xterm"]')).toBeVisible({ timeout: 10000 });

      // Resize the viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);

      // Terminal should still be visible
      await expect(page.locator('[class*="xterm"]')).toBeVisible();

      // Resize again
      await page.setViewportSize({ width: 1600, height: 900 });
      await page.waitForTimeout(500);

      await expect(page.locator('[class*="xterm"]')).toBeVisible();
    } else {
      test.skip(true, 'No projects available for testing');
    }
  });

  test('should show terminal ready indicator', async ({ page }) => {
    await page.waitForTimeout(1000);

    const projectItems = page.locator('[class*="sidebar"] button').filter({ hasText: /.+/ });
    const count = await projectItems.count();

    if (count > 0) {
      await projectItems.first().click();

      // Wait for terminal ready event
      await page.waitForTimeout(2000);

      // Check for connection status
      const connected = page.locator('text=ONLINE').or(page.locator('text=CONNECTED'));
      await expect(connected).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No projects available for testing');
    }
  });
});

test.describe('Terminal Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });
  });

  test('should reconnect to session on page reload', async ({ page }) => {
    await page.waitForTimeout(1000);

    const projectItems = page.locator('[class*="sidebar"] button').filter({ hasText: /.+/ });
    const count = await projectItems.count();

    if (count > 0) {
      // Select a project
      await projectItems.first().click();
      await expect(page.locator('[class*="xterm"]')).toBeVisible({ timeout: 10000 });

      // Reload the page
      await page.reload();
      await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

      // Terminal should reconnect
      await page.waitForTimeout(2000);

      // Check for reconnection indicator
      const terminal = page.locator('[class*="xterm"]');
      await expect(terminal).toBeVisible({ timeout: 10000 });
    } else {
      test.skip(true, 'No projects available for testing');
    }
  });
});
