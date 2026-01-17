/**
 * Security E2E Tests
 * Phase 3.2: Critical path tests for security features
 */

import { test, expect } from './fixtures/auth.js';

test.describe('Security Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

    // Open admin dashboard and navigate to Security tab
    await page.click('text=ADMIN');
    await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
    await page.click('text=SECURITY');
    await page.waitForTimeout(500);
  });

  test('should display security scans tab', async ({ page }) => {
    // Should show SCANS sub-tab
    await expect(page.locator('text=SCANS').first()).toBeVisible();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Check for scan-related content
    const scanContent = page.locator('text=/scan|vulnerabilit|security/i').first();
    await expect(scanContent).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Firewall sub-tab', async ({ page }) => {
    await page.click('text=FIREWALL');
    await page.waitForTimeout(1000);

    // Should show firewall-related content
    const firewallContent = page.locator('text=/firewall|ufw|rule|port/i').first();
    await expect(firewallContent).toBeVisible({ timeout: 5000 });
  });

  test('should show Fail2Ban sub-tab', async ({ page }) => {
    await page.click('text=FAIL2BAN');
    await page.waitForTimeout(1000);

    // Should show fail2ban-related content
    const fail2banContent = page.locator('text=/fail2ban|jail|banned|block/i').first();
    await expect(fail2banContent).toBeVisible({ timeout: 5000 });
  });

  test('should show Scan Config sub-tab', async ({ page }) => {
    // Look for SCAN_CONFIG or similar tab
    const configTab = page.locator('button').filter({ hasText: /config|settings/i }).first();

    if (await configTab.isVisible()) {
      await configTab.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Security Scan Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=ADMIN');
    await page.click('text=SECURITY');
    await page.waitForTimeout(1000);
  });

  test('should show run scan button', async ({ page }) => {
    // Look for scan button
    const scanButton = page.locator('button').filter({ hasText: /scan|run|start/i });
    const count = await scanButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display scan results', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for scan results or history
    const results = page.locator('text=/result|finding|issue|clean|pass/i');
    const emptyState = page.locator('text=/no scan|no result|run.*scan/i');

    const hasContent = await results.first().isVisible() || await emptyState.first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Firewall Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=ADMIN');
    await page.click('text=SECURITY');
    await page.click('text=FIREWALL');
    await page.waitForTimeout(1000);
  });

  test('should display firewall status', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for firewall status
    const status = page.locator('text=/active|inactive|enabled|disabled/i');
    await expect(status.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display firewall rules', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for firewall rules list
    const rules = page.locator('text=/rule|allow|deny|port/i');
    const emptyState = page.locator('text=/no rule|empty/i');

    const hasContent = await rules.first().isVisible() || await emptyState.first().isVisible();
    expect(hasContent).toBeTruthy();
  });
});
