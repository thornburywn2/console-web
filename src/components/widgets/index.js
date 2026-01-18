/**
 * Widget Components Module
 * Exports all widget-related components and utilities
 */

// Constants and utilities
export {
  GAP,
  FAVORITES_KEY,
  getFavorites,
  HEIGHT_SNAPS,
  WIDGET_TYPES,
  DEFAULT_WIDGETS,
  SIDEBAR_DEFAULTS,
  LEFT_SIDEBAR_DEFAULTS,
} from './constants';

// Widget components
export { default as DockerWidget } from './DockerWidget';
export { default as ProjectsWidget } from './ProjectsWidget';
export { default as AgentsWidget } from './AgentsWidget';
export { default as DraggableWidget } from './DraggableWidget';
export { default as AddWidgetModal } from './AddWidgetModal';
export { default as NoProjectSelected } from './NoProjectSelected';
