/**
 * ErrorBoundary Stories
 * Stories for the error boundary and fallback components
 */

import { ErrorBoundary, TabErrorFallback } from '../components/admin/shared/ErrorBoundary';

export default {
  title: 'Admin/Shared/ErrorBoundary',
  component: TabErrorFallback,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Error boundary component that catches errors in tab components to prevent full dashboard crashes. Displays a user-friendly fallback UI with retry options.',
      },
    },
  },
  argTypes: {
    tabName: { control: 'text', description: 'Name of the component that failed' },
    onRetry: { action: 'retry' },
  },
};

// Mock error with stack trace
const mockError = new Error('Failed to fetch data from API');
mockError.stack = `Error: Failed to fetch data from API
    at fetchData (http://localhost:5275/src/components/admin/tabs/ProjectsTab.jsx:45:15)
    at useApiQuery (http://localhost:5275/src/hooks/useApiQuery.js:23:10)
    at ProjectsTab (http://localhost:5275/src/components/admin/tabs/ProjectsTab.jsx:12:5)
    at renderWithHooks (http://localhost:5275/node_modules/react-dom/cjs/react-dom.development.js:14985:18)`;

export const Default = {
  args: {
    error: mockError,
    tabName: 'Projects',
  },
};

export const WithCustomTabName = {
  args: {
    error: mockError,
    tabName: 'Docker Services',
  },
};

export const WithNetworkError = {
  args: {
    error: new Error('NetworkError: Failed to connect to server'),
    tabName: 'Server Overview',
  },
};

export const WithGenericError = {
  args: {
    error: null,
    tabName: 'Component',
  },
  parameters: {
    docs: {
      description: {
        story: 'When no error object is provided, shows generic message.',
      },
    },
  },
};

// Component that throws an error
const BrokenComponent = () => {
  throw new Error('This component intentionally crashes!');
};

// Safe component
const SafeComponent = () => (
  <div className="hacker-card p-4">
    <h3 className="text-hacker-green font-mono">Working Component</h3>
    <p className="text-hacker-text-dim text-sm">This component renders correctly.</p>
  </div>
);

export const WithWorkingChild = {
  render: () => (
    <ErrorBoundary tabName="Safe Tab">
      <SafeComponent />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'When children render without errors, ErrorBoundary is transparent.',
      },
    },
  },
};

export const FallbackOnly = {
  render: (args) => <TabErrorFallback {...args} />,
  args: {
    error: mockError,
    tabName: 'Security Scans',
  },
  parameters: {
    docs: {
      description: {
        story: 'The TabErrorFallback component can be used directly for manual error handling.',
      },
    },
  },
};

export const WithLongErrorMessage = {
  args: {
    error: new Error('API returned 500 Internal Server Error: The server encountered an unexpected condition that prevented it from fulfilling the request. Please try again later or contact support if the problem persists.'),
    tabName: 'API Status',
  },
  parameters: {
    docs: {
      description: {
        story: 'Long error messages are displayed cleanly.',
      },
    },
  },
};
