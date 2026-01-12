import { useState } from 'react';

function QuickActions({ onRefresh, onOpenAdmin }) {
  const [actionStatus, setActionStatus] = useState({});

  const handleAction = async (actionKey, action) => {
    setActionStatus((prev) => ({ ...prev, [actionKey]: 'loading' }));
    try {
      await action();
      setActionStatus((prev) => ({ ...prev, [actionKey]: 'success' }));
      setTimeout(() => {
        setActionStatus((prev) => ({ ...prev, [actionKey]: null }));
      }, 1500);
    } catch (err) {
      console.error(`Action ${actionKey} failed:`, err);
      setActionStatus((prev) => ({ ...prev, [actionKey]: 'error' }));
      setTimeout(() => {
        setActionStatus((prev) => ({ ...prev, [actionKey]: null }));
      }, 2000);
    }
  };

  const actions = [
    {
      key: 'refresh',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      label: 'Refresh',
      action: () => {
        onRefresh();
        return Promise.resolve();
      },
      color: 'green',
    },
    {
      key: 'admin',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Admin',
      action: () => {
        onOpenAdmin();
        return Promise.resolve();
      },
      color: 'cyan',
    },
    {
      key: 'scan',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      label: 'Port Scan',
      action: async () => {
        await fetch('/api/ports/scan', { method: 'POST' });
      },
      color: 'purple',
    },
    {
      key: 'clearCache',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      label: 'Clear Cache',
      action: async () => {
        localStorage.removeItem('cw-last-accessed');
        onRefresh();
      },
      color: 'warning',
    },
  ];

  const getButtonStyle = (action, status) => {
    const baseClasses =
      'flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center';

    const colorMap = {
      green: {
        normal: 'border-hacker-green/20 hover:border-hacker-green/40 hover:bg-hacker-green/10',
        loading: 'border-hacker-green/40 bg-hacker-green/10',
        success: 'border-hacker-green/60 bg-hacker-green/20',
        error: 'border-hacker-error/40 bg-hacker-error/10',
      },
      cyan: {
        normal: 'border-hacker-cyan/20 hover:border-hacker-cyan/40 hover:bg-hacker-cyan/10',
        loading: 'border-hacker-cyan/40 bg-hacker-cyan/10',
        success: 'border-hacker-cyan/60 bg-hacker-cyan/20',
        error: 'border-hacker-error/40 bg-hacker-error/10',
      },
      purple: {
        normal: 'border-hacker-purple/20 hover:border-hacker-purple/40 hover:bg-hacker-purple/10',
        loading: 'border-hacker-purple/40 bg-hacker-purple/10',
        success: 'border-hacker-purple/60 bg-hacker-purple/20',
        error: 'border-hacker-error/40 bg-hacker-error/10',
      },
      warning: {
        normal: 'border-hacker-warning/20 hover:border-hacker-warning/40 hover:bg-hacker-warning/10',
        loading: 'border-hacker-warning/40 bg-hacker-warning/10',
        success: 'border-hacker-warning/60 bg-hacker-warning/20',
        error: 'border-hacker-error/40 bg-hacker-error/10',
      },
    };

    const colors = colorMap[action.color] || colorMap.green;
    const stateClass = status ? colors[status] : colors.normal;

    return `${baseClasses} ${stateClass}`;
  };

  const getIconColor = (action) => {
    const colorMap = {
      green: 'text-hacker-green',
      cyan: 'text-hacker-cyan',
      purple: 'text-hacker-purple',
      warning: 'text-hacker-warning',
    };
    return colorMap[action.color] || 'text-hacker-green';
  };

  return (
    <div className="grid grid-cols-4 gap-1">
      {actions.map((action) => {
        const status = actionStatus[action.key];
        return (
          <button
            key={action.key}
            onClick={() => handleAction(action.key, action.action)}
            disabled={status === 'loading'}
            className={getButtonStyle(action, status)}
            title={action.label}
          >
            <span className={`${getIconColor(action)} ${status === 'loading' ? 'animate-spin' : ''}`}>
              {status === 'success' ? (
                <svg className="w-4 h-4 text-hacker-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : status === 'error' ? (
                <svg className="w-4 h-4 text-hacker-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                action.icon
              )}
            </span>
            <span className="text-[9px] font-mono text-hacker-text-dim mt-1 leading-tight">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default QuickActions;
