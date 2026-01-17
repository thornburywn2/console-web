/**
 * TabContainer Stories
 * Stories for the tab content container component
 */

import { TabContainer } from '../components/admin/shared/TabContainer';

export default {
  title: 'Admin/Shared/TabContainer',
  component: TabContainer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Wrapper for tab content with consistent styling and fade-in animation. Used to wrap all tab pane content.',
      },
    },
  },
  argTypes: {
    className: { control: 'text', description: 'Additional CSS classes' },
  },
};

// Example content blocks
const ExampleContent = () => (
  <>
    <div className="bg-hacker-surface p-4 rounded-lg border border-hacker-green/30">
      <h3 className="text-hacker-green font-mono mb-2">Section One</h3>
      <p className="text-hacker-text-dim text-sm">Example content block with consistent spacing.</p>
    </div>
    <div className="bg-hacker-surface p-4 rounded-lg border border-hacker-cyan/30">
      <h3 className="text-hacker-cyan font-mono mb-2">Section Two</h3>
      <p className="text-hacker-text-dim text-sm">Another content block demonstrating the space-y-6 gap.</p>
    </div>
    <div className="bg-hacker-surface p-4 rounded-lg border border-hacker-purple/30">
      <h3 className="text-hacker-purple font-mono mb-2">Section Three</h3>
      <p className="text-hacker-text-dim text-sm">Third section showing consistent vertical rhythm.</p>
    </div>
  </>
);

export const Default = {
  render: () => (
    <TabContainer>
      <ExampleContent />
    </TabContainer>
  ),
};

export const WithCustomClass = {
  render: () => (
    <TabContainer className="max-w-2xl mx-auto">
      <ExampleContent />
    </TabContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Additional classes can be passed to customize the container.',
      },
    },
  },
};

export const SingleChild = {
  render: () => (
    <TabContainer>
      <div className="bg-hacker-surface p-6 rounded-lg border border-hacker-green/30">
        <h3 className="text-hacker-green font-mono mb-2">Single Content Block</h3>
        <p className="text-hacker-text-dim text-sm">
          TabContainer works with single children too, providing consistent animation.
        </p>
      </div>
    </TabContainer>
  ),
};

export const NestedContainers = {
  render: () => (
    <TabContainer>
      <div className="bg-hacker-surface p-4 rounded-lg border border-hacker-green/30">
        <h3 className="text-hacker-green font-mono mb-4">Parent Section</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-hacker-bg p-3 rounded border border-hacker-cyan/30">
            <h4 className="text-hacker-cyan text-sm font-mono">Nested 1</h4>
          </div>
          <div className="bg-hacker-bg p-3 rounded border border-hacker-cyan/30">
            <h4 className="text-hacker-cyan text-sm font-mono">Nested 2</h4>
          </div>
        </div>
      </div>
      <div className="bg-hacker-surface p-4 rounded-lg border border-hacker-purple/30">
        <h3 className="text-hacker-purple font-mono">Another Section</h3>
      </div>
    </TabContainer>
  ),
  parameters: {
    docs: {
      description: {
        story: 'TabContainer works well with complex nested layouts.',
      },
    },
  },
};
