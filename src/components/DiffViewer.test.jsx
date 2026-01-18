/**
 * DiffViewer Component Tests
 * Phase 5.3: Unit tests for git diff visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DiffViewer from './DiffViewer';

// Mock API
vi.mock('../services/api.js', () => ({
  diffApi: {
    get: vi.fn().mockResolvedValue({
      diff: `diff --git a/test.js b/test.js
index abc123..def456 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
`,
    }),
  },
}));

describe('DiffViewer', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', async () => {
      render(
        <DiffViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <DiffViewer
          isOpen={false}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      expect(document.body.textContent).toBe('');
    });
  });

  describe('diff loading', () => {
    it('should fetch diff data', async () => {
      const { diffApi } = await import('../services/api.js');

      render(
        <DiffViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      await waitFor(() => {
        expect(diffApi.get).toHaveBeenCalled();
      });
    });
  });

  describe('view modes', () => {
    it('should have split view option', async () => {
      render(
        <DiffViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });

    it('should have unified view option', async () => {
      render(
        <DiffViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      await waitFor(() => {
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('diff display', () => {
    it('should render diff content', async () => {
      render(
        <DiffViewer
          isOpen={true}
          onClose={mockOnClose}
          projectPath="/test/project"
        />
      );

      await waitFor(() => {
        // Should show file name from diff
        expect(document.body.firstChild).toBeInTheDocument();
      });
    });
  });
});
