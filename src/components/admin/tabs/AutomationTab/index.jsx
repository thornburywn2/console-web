/**
 * AutomationTab Component
 * Combines Agents and MCP Servers with marketplace interface
 */

import { useState } from 'react';
import { AUTOMATION_TABS, AGENT_TABS } from '../../constants';
import { SubTabBar, TabContainer } from '../../shared';
import AgentsPane from './AgentsPane';
import MCPPane from './MCPPane';

/**
 * AutomationTab - Combined automation management interface
 * Sub-tabs: AGENTS, MCP (marketplace-style)
 */
export function AutomationTab({ projects = [] }) {
  const [activeSubTab, setActiveSubTab] = useState(AUTOMATION_TABS.AGENTS);

  // Define sub-tabs with styling
  const subTabs = [
    { key: AUTOMATION_TABS.AGENTS, label: 'AGENTS', color: 'green' },
    { key: AUTOMATION_TABS.MCP, label: 'MCP SERVERS', color: 'purple' },
  ];

  return (
    <TabContainer>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={subTabs}
        activeTab={activeSubTab}
        setActiveTab={setActiveSubTab}
        dividers={[1]} // Divider after AGENTS
      />

      {/* Content */}
      {activeSubTab === AUTOMATION_TABS.AGENTS && (
        <AgentsPane projects={projects} />
      )}

      {activeSubTab === AUTOMATION_TABS.MCP && (
        <MCPPane />
      )}
    </TabContainer>
  );
}

export default AutomationTab;
