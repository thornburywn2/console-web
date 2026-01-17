/**
 * No Project Selected Placeholder
 * Shown when a widget requires a project but none is selected
 */

import { WIDGET_TYPES } from './constants';

export default function NoProjectSelected({ widgetType }) {
  const config = WIDGET_TYPES[widgetType];
  return (
    <div className="text-center py-4">
      <span className="text-2xl opacity-50">{config?.icon || '📦'}</span>
      <div className="text-xs font-mono mt-2" style={{ color: 'var(--text-secondary)' }}>
        Select a project
      </div>
    </div>
  );
}
