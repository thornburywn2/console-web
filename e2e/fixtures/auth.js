/**
 * Auth Test Fixtures
 * Phase 3.1.4: Authentication helpers for E2E tests
 *
 * Supports two modes:
 * 1. AUTH_ENABLED=false (default for tests) - bypasses auth
 * 2. AUTH_ENABLED=true - uses test credentials from env
 */

import { test as base, expect } from '@playwright/test';

// Test user credentials (from environment or defaults for local testing)
const TEST_USER = {
  username: process.env.TEST_USER || 'test@example.com',
  password: process.env.TEST_PASSWORD || 'testpassword123',
};

/**
 * Extended test with authentication support
 */
export const test = base.extend({
  /**
   * Authenticated page - logs in before each test
   */
  authenticatedPage: async ({ page }, use) => {
    // Check if auth is enabled
    const authEnabled = process.env.AUTH_ENABLED === 'true';

    if (authEnabled) {
      // Navigate to the app (may redirect to login)
      await page.goto('/');

      // Check if we're on a login page
      const isLoginPage = await page.locator('input[name="username"]').isVisible().catch(() => false);

      if (isLoginPage) {
        // Fill in credentials
        await page.fill('input[name="username"]', TEST_USER.username);
        await page.fill('input[name="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');

        // Wait for redirect back to app
        await page.waitForURL('**/');
      }
    } else {
      // Auth disabled - just navigate to the app
      await page.goto('/');
    }

    // Wait for app to be ready
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

    await use(page);
  },

  /**
   * Page with stored auth state (for faster tests)
   */
  authState: async ({ browser }, use) => {
    const authEnabled = process.env.AUTH_ENABLED === 'true';

    if (authEnabled) {
      // Create a new context and log in
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/');

      const isLoginPage = await page.locator('input[name="username"]').isVisible().catch(() => false);

      if (isLoginPage) {
        await page.fill('input[name="username"]', TEST_USER.username);
        await page.fill('input[name="password"]', TEST_USER.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/');
      }

      // Get storage state
      const storageState = await context.storageState();
      await context.close();

      await use(storageState);
    } else {
      await use(null);
    }
  },
});

export { expect };

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page) {
  try {
    // Check for user-specific elements that indicate logged-in state
    const userIndicator = page.locator('[data-testid="user-avatar"]')
      .or(page.locator('text=Logout'))
      .or(page.locator('text=Sign Out'));

    return await userIndicator.isVisible({ timeout: 1000 });
  } catch {
    return false;
  }
}

/**
 * Helper to wait for app to be fully loaded
 */
export async function waitForAppReady(page) {
  // Wait for main app container
  await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

  // Wait for socket connection
  await page.waitForFunction(() => {
    return window.__socketConnected === true;
  }, { timeout: 5000 }).catch(() => {
    // Socket connection tracking may not be exposed, that's OK
  });

  // Wait for initial data load
  await page.waitForTimeout(500);
}

/**
 * Helper to navigate to admin dashboard
 */
export async function openAdminDashboard(page) {
  await page.click('text=ADMIN');
  await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
}

/**
 * Helper to close admin dashboard
 */
export async function closeAdminDashboard(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Helper to select a project from sidebar
 */
export async function selectProject(page, projectName) {
  // Find project in sidebar
  const projectItem = page.locator(`text=${projectName}`).first();
  await projectItem.click();

  // Wait for terminal to be ready
  await expect(page.locator('[class*="terminal"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Helper to wait for terminal ready
 */
export async function waitForTerminalReady(page) {
  await expect(page.locator('[class*="terminal"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500); // Allow terminal to initialize
}
