/**
 * SubTabBar Stories
 * Stories for the sub-navigation bar component
 */

import { useState } from 'react';
import { SubTabBar } from '../components/admin/shared/SubTabBar';

export default {
  title: 'Admin/Shared/SubTabBar',
  component: SubTabBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Horizontal sub-navigation bar for tab panes. Supports multiple color themes, badges, dividers, and an optional refresh button.',
      },
    },
  },
  argTypes: {
    activeTab: { control: 'text' },
    loading: { control: 'boolean' },
    onRefresh: { action: 'refresh' },
    setActiveTab: { action: 'setActiveTab' },
  },
};

// Basic tabs configuration
const basicTabs = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'details', label: 'DETAILS' },
  { key: 'settings', label: 'SETTINGS' },
];

// Tabs with different colors
const coloredTabs = [
  { key: 'overview', label: 'OVERVIEW', color: 'green' },
  { key: 'docker', label: 'DOCKER', color: 'cyan' },
  { key: 'services', label: 'SERVICES', color: 'purple' },
  { key: 'network', label: 'NETWORK', color: 'blue' },
  { key: 'security', label: 'SECURITY', color: 'warning' },
];

// Tabs with badges
const tabsWithBadges = [
  { key: 'all', label: 'ALL' },
  { key: 'errors', label: 'ERRORS', color: 'error', badge: 5 },
  { key: 'warnings', label: 'WARNINGS', color: 'warning', badge: 12 },
  { key: 'success', label: 'SUCCESS', color: 'green', badge: 0 },
];

// Server tab example
const serverTabs = [
  { key: 'overview', label: 'OVERVIEW', color: 'green' },
  { key: 'services', label: 'SERVICES', color: 'cyan' },
  { key: 'docker', label: 'DOCKER', color: 'cyan' },
  { key: 'stack', label: 'STACK', color: 'cyan' },
  { key: 'packages', label: 'PACKAGES', color: 'purple' },
  { key: 'logs', label: 'LOGS', color: 'purple' },
  { key: 'processes', label: 'PROCESSES', color: 'purple' },
  { key: 'network', label: 'NETWORK', color: 'blue' },
  { key: 'scheduled', label: 'SCHEDULED', color: 'blue' },
];

// Interactive wrapper
const InteractiveWrapper = ({ tabs, dividers = [], showRefresh = false }) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key);
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <SubTabBar
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      dividers={dividers}
      onRefresh={showRefresh ? handleRefresh : undefined}
      loading={loading}
    />
  );
};

export const Default = {
  args: {
    tabs: basicTabs,
    activeTab: 'overview',
  },
};

export const WithColors = {
  args: {
    tabs: coloredTabs,
    activeTab: 'overview',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabs can have different color themes: green, cyan, purple, blue, warning, error.',
      },
    },
  },
};

export const WithBadges = {
  args: {
    tabs: tabsWithBadges,
    activeTab: 'all',
  },
  parameters: {
    docs: {
      description: {
        story: 'Tabs can display badge counts. Badges with 0 are hidden.',
      },
    },
  },
};

export const WithDividers = {
  args: {
    tabs: serverTabs,
    activeTab: 'overview',
    dividers: [1, 4, 7],
  },
  parameters: {
    docs: {
      description: {
        story: 'Dividers can be placed at specific indices to group related tabs.',
      },
    },
  },
};

export const WithRefreshButton = {
  args: {
    tabs: basicTabs,
    activeTab: 'overview',
    loading: false,
  },
  render: (args) => (
    <SubTabBar {...args} onRefresh={() => alert('Refresh clicked!')} />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Optional refresh button appears when onRefresh handler is provided.',
      },
    },
  },
};

export const Loading = {
  args: {
    tabs: basicTabs,
    activeTab: 'overview',
    loading: true,
  },
  render: (args) => (
    <SubTabBar {...args} onRefresh={() => {}} />
  ),
};

export const ServerTabExample = {
  render: () => <InteractiveWrapper tabs={serverTabs} dividers={[1, 4, 7]} showRefresh />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive example matching the Server tab in AdminDashboard.',
      },
    },
  },
};

export const Interactive = {
  render: () => <InteractiveWrapper tabs={coloredTabs} />,
  parameters: {
    docs: {
      description: {
        story: 'Click tabs to see state changes.',
      },
    },
  },
};
