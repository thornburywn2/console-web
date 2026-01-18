/**
 * AudioVisualization Component
 * Visual feedback for audio level during voice recording
 */

import { AudioLevelIndicator } from '../../hooks/useVoiceActivityDetection.jsx';

export default function AudioVisualization({
  audioLevel,
  peakLevel,
  threshold,
  isSpeaking
}) {
  return (
    <div className="mt-4 space-y-2">
      {/* Real-time audio level bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-12">Level:</span>
        <AudioLevelIndicator
          level={audioLevel}
          peak={peakLevel}
          threshold={threshold}
          width={180}
          height={6}
          showThreshold={true}
        />
        {isSpeaking && (
          <span className="text-xs text-green-400 font-medium">Speaking</span>
        )}
      </div>

      {/* Animated bars for visual feedback */}
      <div className="flex items-center justify-center gap-1">
        {[...Array(7)].map((_, i) => {
          // Use audio level to drive bar heights with index-based variation
          const baseHeight = 8;
          // Create wave-like variation using index (center bars taller)
          const centerBias = 1 - Math.abs(i - 3) / 4;
          const levelBoost = audioLevel * 200 * (0.7 + centerBias * 0.3);
          const height = Math.max(baseHeight, Math.min(32, baseHeight + levelBoost));

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-75 ${
                isSpeaking ? 'bg-green-400' : 'bg-blue-400'
              }`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}
