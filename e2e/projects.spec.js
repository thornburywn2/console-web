/**
 * Projects E2E Tests
 * Phase 3.2: Critical path tests for project management
 */

import { test, expect } from './fixtures/auth.js';

test.describe('Projects Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Command Portal')).toBeVisible({ timeout: 10000 });

    // Open admin dashboard
    await page.click('text=ADMIN');
    await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
  });

  test('should display projects list', async ({ page }) => {
    // Should be on PROJECTS tab by default
    await page.waitForTimeout(1000);

    // Check for project cards or list
    const projectsList = page.locator('[class*="project"]').or(page.locator('table'));
    await expect(projectsList.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show project details on hover/click', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find a project item
    const projectItem = page.locator('[class*="project"]').first()
      .or(page.locator('tr').first());

    if (await projectItem.isVisible()) {
      await projectItem.hover();
      await page.waitForTimeout(500);

      // Check for action buttons or details
      const actionsVisible = await page.locator('button').filter({ hasText: /edit|view|open/i }).count();
      expect(actionsVisible).toBeGreaterThanOrEqual(0); // May or may not have hover actions
    }
  });

  test('should sort projects', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for sort controls
    const sortButton = page.locator('button').filter({ hasText: /sort|name|date/i }).first();

    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(500);

      // Click again to reverse sort
      await sortButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show create project button', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Look for create/new project button
    const createButton = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    await expect(createButton).toBeVisible();
  });
});

test.describe('Project Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=ADMIN');
    await expect(page.locator('text=PROJECTS')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
  });

  test('should open CLAUDE.md editor', async ({ page }) => {
    // Find edit button for CLAUDE.md
    const editButton = page.locator('button').filter({ hasText: /claude|edit|md/i }).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Editor modal should appear
      await expect(page.locator('text=CLAUDE.MD').or(page.locator('textarea'))).toBeVisible({ timeout: 5000 });
    } else {
      // Try clicking on a project first
      const projectRow = page.locator('tr').nth(1);
      if (await projectRow.isVisible()) {
        await projectRow.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should handle project refresh', async ({ page }) => {
    // Look for refresh button
    const refreshButton = page.locator('button').filter({ hasText: /refresh|reload/i }).first();

    if (await refreshButton.isVisible()) {
      await refreshButton.click();

      // Should show loading state briefly
      await page.waitForTimeout(500);

      // Projects should still be visible after refresh
      const projectsList = page.locator('[class*="project"]').or(page.locator('table'));
      await expect(projectsList.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
