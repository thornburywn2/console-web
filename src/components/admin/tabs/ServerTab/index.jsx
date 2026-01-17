/**
 * ServerTab Component
 * Server/Infrastructure management (renamed from INFRASTRUCTURE)
 * Sub-tabs: OVERVIEW, SERVICES, DOCKER, STACK, PACKAGES, LOGS, PROCESSES, NETWORK, AUTHENTIK, USERS
 */

import { useState, useEffect } from 'react';
import { SERVER_TABS } from '../../constants';
import { SubTabBar, TabContainer } from '../../shared';
import OverviewPane from './OverviewPane';
import ServicesPane from './ServicesPane';
import DockerPane from './DockerPane';
import StackPane from './StackPane';
import PackagesPane from './PackagesPane';
import LogsPane from './LogsPane';
import ProcessesPane from './ProcessesPane';
import NetworkPane from './NetworkPane';
import ScheduledPane from '../AutomationTab/ScheduledPane';
import AuthentikPane from './AuthentikPane';
import UsersPane from './UsersPane';

/**
 * ServerTab - Server infrastructure management interface
 * Renamed from INFRASTRUCTURE, reorganized sub-tabs
 */
export function ServerTab() {
  const [activeSubTab, setActiveSubTab] = useState(SERVER_TABS.OVERVIEW);

  // Define sub-tabs with styling and grouping
  const subTabs = [
    { key: SERVER_TABS.OVERVIEW, label: 'OVERVIEW', color: 'green' },
    { key: SERVER_TABS.SERVICES, label: 'SERVICES', color: 'green' },
    { key: SERVER_TABS.DOCKER, label: 'DOCKER', color: 'cyan' },
    { key: SERVER_TABS.STACK, label: 'STACK', color: 'purple' },
    { key: SERVER_TABS.PACKAGES, label: 'PACKAGES', color: 'warning' },
    { key: SERVER_TABS.LOGS, label: 'LOGS', color: 'blue' },
    { key: SERVER_TABS.PROCESSES, label: 'PROCESSES', color: 'cyan' },
    { key: SERVER_TABS.NETWORK, label: 'NETWORK', color: 'green' },
    { key: SERVER_TABS.SCHEDULED, label: 'SCHEDULED', color: 'purple' },
    { key: SERVER_TABS.AUTHENTIK, label: 'AUTHENTIK', color: 'warning' },
    { key: SERVER_TABS.USERS, label: 'USERS', color: 'cyan' },
  ];

  // Dividers to group related sub-tabs: [OVERVIEW] | [SERVICES DOCKER STACK] | [PACKAGES LOGS PROCESSES] | [NETWORK SCHEDULED] | [AUTHENTIK USERS]
  const dividers = [1, 4, 7, 9];

  return (
    <TabContainer>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={subTabs}
        activeTab={activeSubTab}
        setActiveTab={setActiveSubTab}
        dividers={dividers}
      />

      {/* Content */}
      {activeSubTab === SERVER_TABS.OVERVIEW && <OverviewPane />}
      {activeSubTab === SERVER_TABS.SERVICES && <ServicesPane />}
      {activeSubTab === SERVER_TABS.DOCKER && <DockerPane />}
      {activeSubTab === SERVER_TABS.STACK && <StackPane />}
      {activeSubTab === SERVER_TABS.PACKAGES && <PackagesPane />}
      {activeSubTab === SERVER_TABS.LOGS && <LogsPane />}
      {activeSubTab === SERVER_TABS.PROCESSES && <ProcessesPane />}
      {activeSubTab === SERVER_TABS.NETWORK && <NetworkPane />}
      {activeSubTab === SERVER_TABS.SCHEDULED && <ScheduledPane />}
      {activeSubTab === SERVER_TABS.AUTHENTIK && <AuthentikPane />}
      {activeSubTab === SERVER_TABS.USERS && <UsersPane />}
    </TabContainer>
  );
}

export default ServerTab;
