/**
 * Split Terminal View Component
 * Multi-pane terminal layout
 */

import { useState } from 'react';

const LAYOUTS = {
  single: { cols: 1, rows: 1, panels: 1 },
  splitH: { cols: 2, rows: 1, panels: 2 },
  splitV: { cols: 1, rows: 2, panels: 2 },
  quad: { cols: 2, rows: 2, panels: 4 },
};

export default function SplitTerminalView({
  children,
  layout = 'single',
  onLayoutChange,
  onPanelFocus,
  activePanelIndex = 0,
}) {
  const [currentLayout, setCurrentLayout] = useState(layout);
  const layoutConfig = LAYOUTS[currentLayout] || LAYOUTS.single;

  const handleLayoutChange = (newLayout) => {
    setCurrentLayout(newLayout);
    onLayoutChange && onLayoutChange(newLayout);
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(' + layoutConfig.cols + ', 1fr)',
    gridTemplateRows: 'repeat(' + layoutConfig.rows + ', 1fr)',
    gap: '2px',
    height: '100%',
    background: 'var(--border-subtle)',
  };

  const panels = Array.isArray(children) ? children : [children];
  const panelsToShow = panels.slice(0, layoutConfig.panels);

  return (
    <div className="h-full flex flex-col">
      <div
        className="flex items-center justify-between px-2 py-1"
        style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1">
          <span className="text-2xs text-muted mr-2">Layout:</span>
          {Object.keys(LAYOUTS).map(key => (
            <button
              key={key}
              onClick={() => handleLayoutChange(key)}
              className={'p-1 rounded transition-colors ' + (currentLayout === key ? 'bg-accent/20 text-accent' : 'text-muted hover:text-primary')}
              title={key}
            >
              <span className="text-xs font-mono">{LAYOUTS[key].panels}</span>
            </button>
          ))}
        </div>
        <span className="text-2xs text-muted">
          {layoutConfig.panels} panel{layoutConfig.panels !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex-1" style={gridStyle}>
        {Array.from({ length: layoutConfig.panels }).map((_, index) => (
          <div
            key={index}
            className={'relative overflow-hidden ' + (index === activePanelIndex ? 'ring-1 ring-accent' : '')}
            style={{ background: 'var(--bg-primary)' }}
            onClick={() => onPanelFocus && onPanelFocus(index)}
          >
            {panelsToShow[index] || (
              <div className="h-full flex items-center justify-center text-muted text-sm">
                Panel {index + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { LAYOUTS };
