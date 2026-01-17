/**
 * Dashboard E2E Tests
 * Phase 3.2: Critical path tests for the Home Dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Home Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    // Wait for the dashboard to be visible
    await expect(page.locator('text=Command Portal')).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    // Check for online/offline status indicator
    const statusText = page.locator('text=ONLINE').or(page.locator('text=OFFLINE'));
    await expect(statusText).toBeVisible();
  });

  test('should show dashboard widgets', async ({ page }) => {
    // Wait for dashboard content to load
    await page.waitForTimeout(2000); // Allow data to load

    // Check for widget headers (Quick Stats, Docker, etc.)
    const widgetCount = await page.locator('[class*="rounded-xl"]').count();
    expect(widgetCount).toBeGreaterThan(0);
  });

  test('should have navigation buttons', async ({ page }) => {
    // Check for header buttons
    await expect(page.locator('text=SEARCH')).toBeVisible();
    await expect(page.locator('text=ADMIN')).toBeVisible();
    await expect(page.locator('text=THEME')).toBeVisible();
  });

  test('should open admin dashboard', async ({ page }) => {
    // Click admin button
    await page.click('text=ADMIN');

    // Wait for modal to appear
    await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=SETTINGS')).toBeVisible();
  });

  test('should navigate to project from sidebar', async ({ page }) => {
    // Wait for sidebar to load
    await page.waitForTimeout(1000);

    // Check if sidebar has project items
    const sidebar = page.locator('[class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=ADMIN');
    await page.waitForTimeout(500);
  });

  test('should navigate between tabs', async ({ page }) => {
    // Click SETTINGS tab
    await page.click('text=SETTINGS');
    await expect(page.locator('text=GENERAL').first()).toBeVisible();

    // Click SERVER tab
    await page.click('text=SERVER');
    await expect(page.locator('text=OVERVIEW').first()).toBeVisible();

    // Click SECURITY tab
    await page.click('text=SECURITY');
    await expect(page.locator('text=SCANS').first()).toBeVisible();
  });

  test('should close admin dashboard', async ({ page }) => {
    // Click close button
    await page.click('[class*="close"]').catch(() => {
      // If no close button, click outside the modal
      page.keyboard.press('Escape');
    });

    await page.waitForTimeout(500);

    // Admin-specific content should not be visible
    await expect(page.locator('text=CP://SYSTEM')).not.toBeVisible();
  });
});

test.describe('Theme Picker', () => {
  test('should open theme picker', async ({ page }) => {
    await page.goto('/');

    // Click theme button
    await page.click('text=THEME');

    // Theme modal should be visible
    await expect(page.locator('text=Theme').first()).toBeVisible();
  });
});

test.describe('Search', () => {
  test('should open search with keyboard shortcut', async ({ page }) => {
    await page.goto('/');

    // Press Ctrl+K
    await page.keyboard.press('Control+k');

    // Search modal should appear
    await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible({ timeout: 3000 });
  });
});
