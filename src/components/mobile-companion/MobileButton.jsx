/**
 * Mobile-optimized button
 */

const VARIANTS = {
  default: 'bg-white/10 text-primary',
  primary: 'bg-accent text-white',
  danger: 'bg-red-500/20 text-red-400'
};

export function MobileButton({ children, onClick, variant = 'default', className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium active:scale-95 transition-transform ${VARIANTS[variant]} ${className}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}
