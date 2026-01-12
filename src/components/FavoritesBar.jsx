/**
 * Favorites Bar Component
 * Pinned items toolbar for quick access
 */

import { useState, useEffect, useCallback } from 'react';

const ITEM_TYPES = {
  project: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    color: '#3498db'
  },
  session: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: '#2ecc71'
  },
  command: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    color: '#9b59b6'
  },
  prompt: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    color: '#f39c12'
  },
  url: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    color: '#e74c3c'
  }
};

function FavoriteItem({ item, onOpen, onRemove, isDragging }) {
  const typeConfig = ITEM_TYPES[item.type] || ITEM_TYPES.project;

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
        isDragging ? 'opacity-50' : 'hover:bg-white/10'
      }`}
      onClick={() => onOpen(item)}
      draggable
    >
      <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
      <span className="text-sm text-secondary truncate max-w-24">{item.name}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-opacity"
      >
        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function AddFavoriteButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted hover:text-primary hover:bg-white/5 rounded-lg transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span>Add</span>
    </button>
  );
}

function AddFavoriteModal({ isOpen, onClose, onAdd }) {
  const [type, setType] = useState('project');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !value) return;
    onAdd({ type, name, value });
    setName('');
    setValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <h3 className="text-lg font-semibold text-primary mb-4">Add Favorite</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Type</label>
            <div className="flex gap-2">
              {Object.entries(ITEM_TYPES).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded capitalize ${
                    type === key
                      ? 'bg-accent/20 text-accent'
                      : 'bg-white/5 text-muted hover:text-primary'
                  }`}
                >
                  {config.icon}
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full px-3 py-2 rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1">
              {type === 'url' ? 'URL' : type === 'command' ? 'Command' : type === 'prompt' ? 'Prompt' : 'Path/ID'}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'url' ? 'https://...' : type === 'command' ? 'npm run dev' : 'Value'}
              className="w-full px-3 py-2 rounded font-mono text-sm"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/80"
            >
              Add Favorite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FavoritesBar({
  onOpenProject,
  onOpenSession,
  onRunCommand,
  onOpenUrl
}) {
  const [favorites, setFavorites] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('favorites-bar');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  // Save favorites
  const saveFavorites = useCallback((items) => {
    localStorage.setItem('favorites-bar', JSON.stringify(items));
    setFavorites(items);
  }, []);

  const handleAdd = useCallback((item) => {
    const newFavorite = {
      id: Date.now(),
      ...item
    };
    saveFavorites([...favorites, newFavorite]);
  }, [favorites, saveFavorites]);

  const handleRemove = useCallback((id) => {
    saveFavorites(favorites.filter(f => f.id !== id));
  }, [favorites, saveFavorites]);

  const handleOpen = useCallback((item) => {
    switch (item.type) {
      case 'project':
        onOpenProject?.(item.value);
        break;
      case 'session':
        onOpenSession?.(item.value);
        break;
      case 'command':
        onRunCommand?.(item.value);
        break;
      case 'url':
        window.open(item.value, '_blank');
        break;
      case 'prompt':
        // Could trigger prompt library
        break;
    }
  }, [onOpenProject, onOpenSession, onRunCommand]);

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const items = [...favorites];
    const draggedIndex = items.findIndex(f => f.id === draggedItem.id);
    const targetIndex = items.findIndex(f => f.id === targetItem.id);

    items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    setFavorites(items);
  };

  const handleDragEnd = () => {
    if (draggedItem) {
      saveFavorites(favorites);
      setDraggedItem(null);
    }
  };

  if (favorites.length === 0 && !showAddModal) {
    return (
      <div className="flex items-center justify-center py-2 px-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 text-sm text-muted hover:text-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Add your first favorite
        </button>
        <AddFavoriteModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 overflow-x-auto"
      style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      {/* Star icon */}
      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>

      {/* Favorite items */}
      {favorites.map(item => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => handleDragOver(e, item)}
          onDragEnd={handleDragEnd}
        >
          <FavoriteItem
            item={item}
            onOpen={handleOpen}
            onRemove={handleRemove}
            isDragging={draggedItem?.id === item.id}
          />
        </div>
      ))}

      {/* Add button */}
      <AddFavoriteButton onClick={() => setShowAddModal(true)} />

      {/* Add modal */}
      <AddFavoriteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}

// Compact favorites widget
export function FavoritesWidget({ favorites = [], onOpen }) {
  if (favorites.length === 0) return null;

  return (
    <div className="space-y-1">
      {favorites.slice(0, 5).map(item => {
        const typeConfig = ITEM_TYPES[item.type] || ITEM_TYPES.project;
        return (
          <button
            key={item.id}
            onClick={() => onOpen(item)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5"
          >
            <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
            <span className="text-sm text-secondary truncate">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}
