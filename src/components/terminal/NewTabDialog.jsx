/**
 * NewTabDialog Component
 * Dialog for creating a new terminal tab with name and color selection
 */

import { useState, useRef, useEffect } from 'react';
import { TAB_COLORS } from './constants';

function NewTabDialog({ isOpen, onClose, onCreate, tabCount = 0 }) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  // Default name suggestion
  const defaultName = `Tab ${tabCount + 1}`;

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedColor(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const tabName = name.trim() || defaultName;
    // Only include color if one was selected (Zod schema expects undefined, not null)
    const options = { displayName: tabName };
    if (selectedColor) {
      options.color = selectedColor;
    }
    console.log('[NewTabDialog] Creating tab with options:', options);
    onCreate(options);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-glass-heavy backdrop-blur-lg border border-border-subtle rounded-xl shadow-xl p-6 w-full max-w-sm"
      >
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          New Terminal Tab
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Tab Name Input */}
          <div className="mb-4">
            <label className="block text-sm text-text-secondary mb-1.5">
              Tab Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              maxLength={50}
              className="w-full px-3 py-2 bg-glass-light border border-border-subtle rounded-lg
                         text-text-primary placeholder:text-text-muted
                         focus:outline-none focus:border-hacker-green focus:ring-1 focus:ring-hacker-green/30
                         transition-colors"
            />
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <label className="block text-sm text-text-secondary mb-2">
              Tab Color (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {/* No color option */}
              <button
                type="button"
                onClick={() => setSelectedColor(null)}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center
                  ${selectedColor === null
                    ? 'border-text-primary ring-2 ring-text-primary/30'
                    : 'border-border-subtle hover:border-text-secondary'
                  }
                  bg-glass-light
                `}
                title="No color"
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Color options */}
              {Object.entries(TAB_COLORS).map(([colorName, colorConfig]) => (
                <button
                  key={colorName}
                  type="button"
                  onClick={() => setSelectedColor(colorName)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${selectedColor === colorName
                      ? 'border-text-primary ring-2 ring-text-primary/30 scale-110'
                      : 'border-transparent hover:border-text-secondary'
                    }
                  `}
                  style={{ backgroundColor: colorConfig.hex }}
                  title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary
                         bg-glass-light hover:bg-glass-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-hacker-green bg-hacker-green/10
                         hover:bg-hacker-green/20 border border-hacker-green/30
                         rounded-lg transition-colors"
            >
              Create Tab
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewTabDialog;
