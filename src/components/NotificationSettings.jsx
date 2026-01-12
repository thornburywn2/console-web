/**
 * Notification Settings Component
 * Configure sound and desktop notifications
 */

import { useState, useEffect } from 'react';

const NOTIFICATION_EVENTS = [
  { id: 'sessionEnd', name: 'Session Ended', description: 'When a terminal session ends' },
  { id: 'commandComplete', name: 'Command Complete', description: 'When a long-running command finishes' },
  { id: 'alertTrigger', name: 'Alert Triggered', description: 'When a system alert is triggered' },
  { id: 'errorDetected', name: 'Error Detected', description: 'When an error is detected in output' },
  { id: 'dockerEvent', name: 'Docker Event', description: 'Container start/stop events' },
];

const SOUNDS = [
  { id: 'none', name: 'None' },
  { id: 'ding', name: 'Ding' },
  { id: 'chime', name: 'Chime' },
  { id: 'beep', name: 'Beep' },
  { id: 'pop', name: 'Pop' },
];

export default function NotificationSettings({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
}) {
  const [localSettings, setLocalSettings] = useState({
    soundEnabled: true,
    desktopEnabled: true,
    soundVolume: 50,
    events: {},
    ...settings,
  });
  const [permissionStatus, setPermissionStatus] = useState('default');

  useEffect(() => {
    if (isOpen && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, [isOpen]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
    }
  };

  const testSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.volume = localSettings.soundVolume / 100;
    audio.play().catch(() => {});
  };

  const testDesktop = () => {
    if (permissionStatus === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Command Portal',
        icon: '/favicon.ico',
      });
    }
  };

  const updateEventSetting = (eventId, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [eventId]: {
          ...(prev.events[eventId] || {}),
          [key]: value,
        },
      },
    }));
  };

  const handleSave = () => {
    onSaveSettings && onSaveSettings(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[80vh] rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold text-primary">Notification Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Global Sound Settings */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span className="font-medium text-primary">Sound Notifications</span>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.soundEnabled}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full peer bg-white/10 peer-checked:bg-accent/50" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
            {localSettings.soundEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localSettings.soundVolume}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, soundVolume: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-xs text-secondary w-8">{localSettings.soundVolume}%</span>
                <button onClick={testSound} className="text-xs text-accent hover:underline">Test</button>
              </div>
            )}
          </div>

          {/* Desktop Notifications */}
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="font-medium text-primary">Desktop Notifications</span>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.desktopEnabled}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, desktopEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full peer bg-white/10 peer-checked:bg-accent/50" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
            {localSettings.desktopEnabled && (
              <div className="space-y-2">
                {permissionStatus !== 'granted' && (
                  <button
                    onClick={requestPermission}
                    className="w-full py-2 text-sm bg-accent/20 text-accent rounded hover:bg-accent/30"
                  >
                    Grant Permission
                  </button>
                )}
                {permissionStatus === 'granted' && (
                  <button onClick={testDesktop} className="text-xs text-accent hover:underline">Send Test Notification</button>
                )}
                {permissionStatus === 'denied' && (
                  <p className="text-xs text-red-400">Notifications are blocked. Enable in browser settings.</p>
                )}
              </div>
            )}
          </div>

          {/* Event-specific settings */}
          <div>
            <h3 className="text-sm font-medium text-secondary mb-2">Event Settings</h3>
            <div className="space-y-2">
              {NOTIFICATION_EVENTS.map(event => (
                <div key={event.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-glass)' }}>
                  <div>
                    <div className="text-sm text-primary">{event.name}</div>
                    <div className="text-2xs text-muted">{event.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={(localSettings.events[event.id] || {}).sound || 'ding'}
                      onChange={(e) => updateEventSetting(event.id, 'sound', e.target.value)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input
                      type="checkbox"
                      checked={(localSettings.events[event.id] || {}).enabled !== false}
                      onChange={(e) => updateEventSetting(event.id, 'enabled', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-secondary hover:text-primary">Cancel</button>
          <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80">Save</button>
        </div>
      </div>
    </div>
  );
}
