/**
 * TabContainer Component
 * Wrapper for tab content with consistent styling and animation
 */

export function TabContainer({ children, className = '' }) {
  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      {children}
    </div>
  );
}

export default TabContainer;
