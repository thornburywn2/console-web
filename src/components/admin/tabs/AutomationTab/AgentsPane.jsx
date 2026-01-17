/**
 * AgentsPane Component
 * Agent management with My Agents and Marketplace sub-tabs
 */

import { useState } from 'react';
import { AGENT_TABS } from '../../constants';
import { SubTabBar } from '../../shared';
import AgentManager from '../../../AgentManager';
import AgentMarketplace from '../../../AgentMarketplace';

export function AgentsPane({ projects = [] }) {
  const [agentSubTab, setAgentSubTab] = useState(AGENT_TABS.MY_AGENTS);

  const subTabs = [
    { key: AGENT_TABS.MY_AGENTS, label: 'MY AGENTS', color: 'green' },
    { key: AGENT_TABS.MARKETPLACE, label: 'MARKETPLACE', color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={subTabs}
        activeTab={agentSubTab}
        setActiveTab={setAgentSubTab}
      />

      {/* My Agents sub-tab */}
      {agentSubTab === AGENT_TABS.MY_AGENTS && (
        <AgentManager />
      )}

      {/* Marketplace sub-tab */}
      {agentSubTab === AGENT_TABS.MARKETPLACE && (
        <AgentMarketplace
          projects={projects}
          onInstall={() => {
            // Switch to My Agents after install
            setAgentSubTab(AGENT_TABS.MY_AGENTS);
          }}
        />
      )}
    </div>
  );
}

export default AgentsPane;
