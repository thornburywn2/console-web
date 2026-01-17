/**
 * TabButton Component
 * Reusable main navigation tab button for AdminDashboard
 */

export function TabButton({ tab, label, icon, activeTab, setActiveTab }) {
  const isActive = activeTab === tab;

  return (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium
        transition-all duration-200 border-b-2 whitespace-nowrap ${
        isActive
          ? 'text-hacker-green border-hacker-green bg-hacker-green/5'
          : 'text-hacker-text-dim border-transparent hover:text-hacker-green/70 hover:border-hacker-green/30'
      }`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="hidden sm:inline font-mono">{label}</span>
    </button>
  );
}

export default TabButton;
