/**
 * AutomationTab Component
 * Combines Agents, MCP Servers, and Scheduled Tasks
 */

import { useState, useEffect, useCallback } from 'react';
import { AUTOMATION_TABS, AGENT_TABS } from '../../constants';
import { SubTabBar, TabContainer } from '../../shared';
import AgentsPane from './AgentsPane';
import MCPPane from './MCPPane';
import ScheduledPane from './ScheduledPane';

/**
 * AutomationTab - Combined automation management interface
 * Sub-tabs: AGENTS, MCP, SCHEDULED
 */
export function AutomationTab({ projects = [] }) {
  const [activeSubTab, setActiveSubTab] = useState(AUTOMATION_TABS.AGENTS);

  // Define sub-tabs with styling
  const subTabs = [
    { key: AUTOMATION_TABS.AGENTS, label: 'AGENTS', color: 'green' },
    { key: AUTOMATION_TABS.MCP, label: 'MCP SERVERS', color: 'purple' },
    { key: AUTOMATION_TABS.SCHEDULED, label: 'SCHEDULED', color: 'cyan' },
  ];

  return (
    <TabContainer>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={subTabs}
        activeTab={activeSubTab}
        setActiveTab={setActiveSubTab}
        dividers={[1, 2]} // Dividers after AGENTS and MCP
      />

      {/* Content */}
      {activeSubTab === AUTOMATION_TABS.AGENTS && (
        <AgentsPane projects={projects} />
      )}

      {activeSubTab === AUTOMATION_TABS.MCP && (
        <MCPPane />
      )}

      {activeSubTab === AUTOMATION_TABS.SCHEDULED && (
        <ScheduledPane />
      )}
    </TabContainer>
  );
}

export default AutomationTab;
