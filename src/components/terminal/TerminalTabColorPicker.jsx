/**
 * TerminalTabColorPicker Component
 * Dropdown menu for selecting tab colors
 */

import { useRef, useEffect } from 'react';
import { TAB_COLORS, TAB_COLOR_KEYS } from './constants';

function TerminalTabColorPicker({ currentColor, onColorChange, onClose }) {
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg bg-glass-medium backdrop-blur-md border border-border-subtle shadow-lg"
      style={{ minWidth: '120px' }}
    >
      <div className="text-xs text-text-secondary mb-2 px-1">Tab Color</div>
      <div className="grid grid-cols-4 gap-1">
        {/* No color option */}
        <button
          onClick={() => {
            onColorChange(null);
            onClose();
          }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
            currentColor === null
              ? 'border-accent-primary ring-2 ring-accent-primary/50'
              : 'border-border-subtle hover:border-text-secondary'
          }`}
          title="No color"
        >
          <span className="text-xs text-text-secondary">×</span>
        </button>

        {/* Color options */}
        {TAB_COLOR_KEYS.map((colorKey) => {
          const color = TAB_COLORS[colorKey];
          return (
            <button
              key={colorKey}
              onClick={() => {
                onColorChange(colorKey);
                onClose();
              }}
              className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                currentColor === colorKey
                  ? 'ring-2 ring-white/50 scale-110'
                  : ''
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TerminalTabColorPicker;
