/**
 * SecurityTab Component
 * Consolidated security management
 * Sub-tabs: SCANS, FIREWALL, FAIL2BAN, AUDIT, SCAN_CONFIG
 */

import { useState } from 'react';
import { SECURITY_TABS } from '../../constants';
import { SubTabBar, TabContainer } from '../../shared';
import ScansPane from './ScansPane';
import FirewallPane from './FirewallPane';
import Fail2banPane from './Fail2banPane';
import AuditPane from './AuditPane';
import ScanConfigPane from './ScanConfigPane';

/**
 * SecurityTab - Consolidated security management interface
 */
export function SecurityTab({ selectedProject }) {
  const [activeSubTab, setActiveSubTab] = useState(SECURITY_TABS.SCANS);

  // Define sub-tabs with styling
  const subTabs = [
    { key: SECURITY_TABS.SCANS, label: 'SECURITY SCANS', color: 'green' },
    { key: SECURITY_TABS.FIREWALL, label: 'FIREWALL', color: 'error' },
    { key: SECURITY_TABS.FAIL2BAN, label: 'FAIL2BAN', color: 'warning' },
    { key: SECURITY_TABS.AUDIT, label: 'AUDIT LOGS', color: 'cyan' },
    { key: SECURITY_TABS.SCAN_CONFIG, label: 'SCAN CONFIG', color: 'purple' },
  ];

  return (
    <TabContainer>
      {/* Sub-tab navigation */}
      <SubTabBar
        tabs={subTabs}
        activeTab={activeSubTab}
        setActiveTab={setActiveSubTab}
        dividers={[1, 4]} // Dividers: [SCANS] | [FIREWALL FAIL2BAN AUDIT] | [SCAN_CONFIG]
      />

      {/* Content */}
      {activeSubTab === SECURITY_TABS.SCANS && (
        <ScansPane selectedProject={selectedProject} />
      )}

      {activeSubTab === SECURITY_TABS.FIREWALL && (
        <FirewallPane />
      )}

      {activeSubTab === SECURITY_TABS.FAIL2BAN && (
        <Fail2banPane />
      )}

      {activeSubTab === SECURITY_TABS.AUDIT && (
        <AuditPane />
      )}

      {activeSubTab === SECURITY_TABS.SCAN_CONFIG && (
        <ScanConfigPane />
      )}
    </TabContainer>
  );
}

export default SecurityTab;
