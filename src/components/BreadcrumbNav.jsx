/**
 * Breadcrumb Navigation Component
 * Navigation breadcrumbs for tracking location in the app
 */

import { useState, useCallback } from 'react';

function BreadcrumbItem({ item, isLast, onClick }) {
  return (
    <>
      <button
        onClick={() => !isLast && onClick(item)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
          isLast
            ? 'text-primary font-medium cursor-default'
            : 'text-muted hover:text-primary hover:bg-white/5'
        }`}
        disabled={isLast}
      >
        {item.icon && <span className="text-sm">{item.icon}</span>}
        <span className="text-sm truncate max-w-32">{item.label}</span>
      </button>
      {!isLast && (
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </>
  );
}

function BreadcrumbDropdown({ items, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-muted hover:text-primary hover:bg-white/5 rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 min-w-40 rounded-lg shadow-xl py-1"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { onSelect(item); setIsOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-secondary hover:bg-white/5"
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BreadcrumbNav({
  items = [],
  maxVisible = 3,
  onNavigate,
  showHome = true
}) {
  const handleClick = useCallback((item) => {
    onNavigate?.(item);
  }, [onNavigate]);

  // Add home item if requested
  const allItems = showHome
    ? [{ id: 'home', label: 'Home', icon: '🏠', path: '/' }, ...items]
    : items;

  // If too many items, collapse middle ones
  const shouldCollapse = allItems.length > maxVisible + 1;
  const visibleItems = shouldCollapse
    ? [
        ...allItems.slice(0, 1),
        { id: 'collapsed', label: '...', collapsed: allItems.slice(1, -maxVisible + 1) },
        ...allItems.slice(-maxVisible + 1)
      ]
    : allItems;

  if (items.length === 0 && !showHome) return null;

  return (
    <nav
      className="flex items-center gap-1 px-4 py-2 overflow-x-auto"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      {visibleItems.map((item, i) => {
        if (item.collapsed) {
          return (
            <div key={item.id} className="flex items-center">
              <BreadcrumbDropdown
                items={item.collapsed}
                onSelect={handleClick}
              />
              <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          );
        }

        return (
          <BreadcrumbItem
            key={item.id || i}
            item={item}
            isLast={i === visibleItems.length - 1}
            onClick={handleClick}
          />
        );
      })}
    </nav>
  );
}

// Hook to manage breadcrumbs
export function useBreadcrumbs(initialItems = []) {
  const [items, setItems] = useState(initialItems);

  const push = useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);

  const pop = useCallback(() => {
    setItems(prev => prev.slice(0, -1));
  }, []);

  const navigateTo = useCallback((item) => {
    setItems(prev => {
      const index = prev.findIndex(i => i.id === item.id);
      if (index >= 0) {
        return prev.slice(0, index + 1);
      }
      return prev;
    });
  }, []);

  const reset = useCallback((newItems = []) => {
    setItems(newItems);
  }, []);

  return {
    items,
    push,
    pop,
    navigateTo,
    reset,
    current: items[items.length - 1]
  };
}

// Compact breadcrumb for mobile
export function CompactBreadcrumb({ items, onBack }) {
  const current = items[items.length - 1];
  const parent = items[items.length - 2];

  if (!current) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {parent && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted hover:text-primary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{parent.label}</span>
        </button>
      )}
      <div className="flex-1" />
      <span className="text-sm font-medium text-primary">{current.label}</span>
    </div>
  );
}
