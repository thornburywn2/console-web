/**
 * TabButton Stories
 * Stories for the main navigation tab button component
 */

import { useState } from 'react';
import { TabButton } from '../components/admin/shared/TabButton';

export default {
  title: 'Admin/Shared/TabButton',
  component: TabButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Main navigation tab button for AdminDashboard. Used for top-level navigation between sections.',
      },
    },
  },
  argTypes: {
    tab: { control: 'text', description: 'Tab identifier' },
    label: { control: 'text', description: 'Display label' },
    icon: { control: 'text', description: 'Icon emoji or element' },
    activeTab: { control: 'text', description: 'Currently active tab' },
    setActiveTab: { action: 'setActiveTab' },
  },
};

// Interactive wrapper for demonstrating state changes
const InteractiveWrapper = ({ children }) => {
  const [activeTab, setActiveTab] = useState('projects');
  return (
    <div className="flex gap-2 bg-hacker-surface p-4 rounded-lg">
      {['projects', 'settings', 'server', 'security'].map((tab) => (
        <TabButton
          key={tab}
          tab={tab}
          label={tab.toUpperCase()}
          icon={tab === 'projects' ? '📁' : tab === 'settings' ? '⚙️' : tab === 'server' ? '🖥️' : '🔒'}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      ))}
    </div>
  );
};

export const Default = {
  args: {
    tab: 'projects',
    label: 'PROJECTS',
    icon: '📁',
    activeTab: 'projects',
  },
};

export const Inactive = {
  args: {
    tab: 'projects',
    label: 'PROJECTS',
    icon: '📁',
    activeTab: 'settings',
  },
};

export const Active = {
  args: {
    tab: 'projects',
    label: 'PROJECTS',
    icon: '📁',
    activeTab: 'projects',
  },
};

export const WithoutIcon = {
  args: {
    tab: 'projects',
    label: 'PROJECTS',
    activeTab: 'projects',
  },
};

export const Interactive = {
  render: () => <InteractiveWrapper />,
  parameters: {
    docs: {
      description: {
        story: 'Click tabs to see the active state change.',
      },
    },
  },
};
