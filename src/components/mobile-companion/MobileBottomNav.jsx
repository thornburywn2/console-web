/**
 * Bottom navigation for mobile
 */

export function MobileBottomNav({ activeTab, onTabChange, tabs }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-1 safe-area-bottom"
      style={{
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border-default)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
            activeTab === tab.id
              ? 'bg-accent/20 text-accent'
              : 'text-muted hover:text-primary'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
