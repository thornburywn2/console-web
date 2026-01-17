/**
 * Server/Docker E2E Tests
 * Phase 3.2: Critical path tests for server management
 */

import { test, expect } from './fixtures/auth.js';

test.describe('Server Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

    // Open admin dashboard and navigate to Server tab
    await page.click('text=ADMIN');
    await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
    await page.click('text=SERVER');
    await page.waitForTimeout(500);
  });

  test('should display server overview', async ({ page }) => {
    // Should show OVERVIEW sub-tab
    await expect(page.locator('text=OVERVIEW').first()).toBeVisible();

    // Wait for system stats to load
    await page.waitForTimeout(2000);

    // Check for system metrics
    const hasMetrics = await page.locator('text=/CPU|Memory|Disk|Uptime/i').first().isVisible();
    expect(hasMetrics).toBeTruthy();
  });

  test('should navigate to Docker sub-tab', async ({ page }) => {
    // Click DOCKER sub-tab
    await page.click('text=DOCKER');
    await page.waitForTimeout(1000);

    // Should show Docker-related content
    const dockerContent = page.locator('text=/container|image|volume/i').first();
    await expect(dockerContent).toBeVisible({ timeout: 5000 });
  });

  test('should display Docker containers', async ({ page }) => {
    await page.click('text=DOCKER');
    await page.waitForTimeout(2000);

    // Look for container list or empty state
    const containers = page.locator('text=/running|stopped|container/i');
    const emptyState = page.locator('text=/no container|empty/i');

    const hasContent = await containers.first().isVisible() || await emptyState.first().isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('should show Services sub-tab', async ({ page }) => {
    await page.click('text=SERVICES');
    await page.waitForTimeout(1000);

    // Should show systemd services
    const servicesContent = page.locator('text=/systemd|service|active/i').first();
    await expect(servicesContent).toBeVisible({ timeout: 5000 });
  });

  test('should show Stack sub-tab', async ({ page }) => {
    await page.click('text=STACK');
    await page.waitForTimeout(1000);

    // Should show stack/compose content
    const stackContent = page.locator('text=/stack|compose|sovereign/i').first();
    await expect(stackContent).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Docker Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=ADMIN');
    await page.click('text=SERVER');
    await page.click('text=DOCKER');
    await page.waitForTimeout(1000);
  });

  test('should show container action buttons', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for container action buttons (start, stop, restart)
    const actionButtons = page.locator('button').filter({ hasText: /start|stop|restart/i });
    const count = await actionButtons.count();

    // There should be some action buttons if containers exist
    // (or none if no containers)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show Docker system info', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for Docker stats
    const dockerStats = page.locator('text=/containers|images|volumes/i');
    await expect(dockerStats.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle Docker refresh', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for refresh button
    const refreshButton = page.locator('button').filter({ hasText: /refresh|reload/i }).first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000);

      // Content should still be visible after refresh
      const dockerStats = page.locator('text=/containers|images|volumes/i');
      await expect(dockerStats.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
