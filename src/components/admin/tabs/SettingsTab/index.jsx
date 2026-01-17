/**
 * SettingsTab Component
 * Main settings tab (promoted from INFRASTRUCTURE sub-tab)
 * Wraps the existing SettingsPanel component
 */

import SettingsPanel from '../../../SettingsPanel';
import { TabContainer } from '../../shared';

/**
 * SettingsTab - Main settings management interface
 * Now promoted to a main tab in the navigation
 */
export function SettingsTab() {
  return (
    <TabContainer>
      <SettingsPanel />
    </TabContainer>
  );
}

export default SettingsTab;
