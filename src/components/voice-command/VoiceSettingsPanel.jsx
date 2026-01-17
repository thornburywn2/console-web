/**
 * VoiceSettingsPanel Component
 * Settings panel for voice command configuration
 */

export default function VoiceSettingsPanel({ settings, onSave, onFeedbackChange }) {
  return (
    <div className="px-4 pb-4 border-t border-white/10 pt-4">
      <h4 className="text-xs font-medium text-gray-400 mb-3">Voice Settings</h4>
      <div className="space-y-3">
        {/* Enable Voice */}
        <label className="flex items-center justify-between">
          <span className="text-sm">Enable voice</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onSave({ enabled: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        {/* Auto Execute */}
        <label className="flex items-center justify-between">
          <span className="text-sm">Auto-execute high confidence</span>
          <input
            type="checkbox"
            checked={settings.autoExecute}
            onChange={(e) => onSave({ autoExecute: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        {/* Push to Talk */}
        <label className="flex items-center justify-between">
          <span className="text-sm">Push-to-talk</span>
          <input
            type="checkbox"
            checked={settings.pushToTalk}
            onChange={(e) => onSave({ pushToTalk: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        {/* Show Transcript */}
        <label className="flex items-center justify-between">
          <span className="text-sm">Show transcript</span>
          <input
            type="checkbox"
            checked={settings.showTranscript}
            onChange={(e) => onSave({ showTranscript: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        {/* Sound Feedback */}
        <label className="flex items-center justify-between">
          <span className="text-sm">Sound feedback</span>
          <input
            type="checkbox"
            checked={settings.playFeedbackSounds}
            onChange={(e) => {
              onSave({ playFeedbackSounds: e.target.checked });
              onFeedbackChange?.(e.target.checked);
            }}
            className="w-4 h-4 rounded"
          />
        </label>

        {/* Confidence Threshold */}
        <div>
          <label className="flex items-center justify-between mb-1">
            <span className="text-sm">Confidence threshold</span>
            <span className="text-xs text-gray-400">
              {(settings.confidenceThreshold * 100).toFixed(0)}%
            </span>
          </label>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={settings.confidenceThreshold}
            onChange={(e) => onSave({ confidenceThreshold: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Language */}
        <div>
          <label className="text-sm mb-1 block">Language</label>
          <select
            value={settings.language}
            onChange={(e) => onSave({ language: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
            <option value="ja-JP">Japanese</option>
            <option value="zh-CN">Chinese (Simplified)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
