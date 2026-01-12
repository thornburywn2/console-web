/**
 * VoiceDisambiguationDialog - Command Disambiguation UI
 * P0 Phase 2: Command Disambiguation
 *
 * Displays when voice command recognition returns multiple
 * possible matches with similar confidence scores.
 * Allows user to select the correct intended command.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HelpCircle, Check, X, ChevronRight, Mic, Terminal, GitBranch,
  Navigation, Layout, FolderOpen, Volume2, ArrowRight
} from 'lucide-react';

/**
 * Get icon for command category
 */
function getCategoryIcon(category) {
  switch (category) {
    case 'terminal':
      return Terminal;
    case 'git':
      return GitBranch;
    case 'navigation':
      return Navigation;
    case 'ui':
      return Layout;
    case 'session':
      return FolderOpen;
    default:
      return Terminal;
  }
}

/**
 * Get color class for command category
 */
function getCategoryColor(category) {
  switch (category) {
    case 'terminal':
      return 'text-green-400 bg-green-500/20';
    case 'git':
      return 'text-orange-400 bg-orange-500/20';
    case 'navigation':
      return 'text-blue-400 bg-blue-500/20';
    case 'ui':
      return 'text-purple-400 bg-purple-500/20';
    case 'session':
      return 'text-cyan-400 bg-cyan-500/20';
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
}

/**
 * Format confidence percentage
 */
function formatConfidence(confidence) {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Single command option in disambiguation list
 */
function CommandOption({
  command,
  isSelected,
  index,
  onSelect,
  onExecute
}) {
  const Icon = getCategoryIcon(command.category);
  const colorClass = getCategoryColor(command.category);

  return (
    <button
      onClick={() => onSelect(index)}
      onDoubleClick={() => onExecute(command)}
      className={`
        w-full text-left p-3 rounded-lg transition-all
        flex items-start gap-3 group
        ${isSelected
          ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/10'
          : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/20'}
      `}
    >
      {/* Category Icon */}
      <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
        <Icon size={16} />
      </div>

      {/* Command Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white truncate">
            {command.description}
          </span>
          {command.matchMethod === 'fuzzy' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              fuzzy
            </span>
          )}
        </div>

        {command.command && (
          <code className="text-xs text-gray-400 font-mono block truncate">
            {command.command}
          </code>
        )}

        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
          <span className="capitalize">{command.category}</span>
          <span>|</span>
          <span>{formatConfidence(command.confidence)} match</span>
        </div>
      </div>

      {/* Selection Indicator */}
      <div className={`
        shrink-0 transition-all
        ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}
      `}>
        {isSelected ? (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Check size={14} className="text-white" />
          </div>
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </div>
    </button>
  );
}

/**
 * Main Disambiguation Dialog Component
 */
export function VoiceDisambiguationDialog({
  isOpen,
  transcript,
  primaryCommand,
  alternatives,
  onSelect,
  onCancel,
  onExecute,
  autoSelectTimeout = 5000 // Auto-select primary after 5s if no action
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(autoSelectTimeout / 1000);
  const dialogRef = useRef(null);
  const timerRef = useRef(null);

  // All commands including primary
  const allCommands = [primaryCommand, ...alternatives].filter(Boolean);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeRemaining(autoSelectTimeout / 1000);
    }
  }, [isOpen, autoSelectTimeout]);

  // Auto-select timer
  useEffect(() => {
    if (!isOpen || autoSelectTimeout <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-execute primary command
          if (allCommands[selectedIndex]) {
            onExecute(allCommands[selectedIndex]);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isOpen, autoSelectTimeout, selectedIndex, allCommands, onExecute]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(allCommands.length - 1, prev + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (allCommands[selectedIndex]) {
            onExecute(allCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          const num = parseInt(e.key) - 1;
          if (num < allCommands.length) {
            setSelectedIndex(num);
            onExecute(allCommands[num]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allCommands, onExecute, onCancel]);

  // Focus management
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || allCommands.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md bg-gray-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <HelpCircle size={18} className="text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">
                Multiple matches found
              </h3>
              <p className="text-xs text-gray-400">
                Which command did you mean?
              </p>
            </div>
            {autoSelectTimeout > 0 && (
              <div className="text-xs text-gray-500">
                Auto-select in {timeRemaining}s
              </div>
            )}
          </div>
        </div>

        {/* Original Transcript */}
        <div className="px-4 py-3 bg-black/20 border-b border-white/5">
          <div className="flex items-center gap-2 text-sm">
            <Mic size={14} className="text-gray-500" />
            <span className="text-gray-400">You said:</span>
            <span className="text-white font-medium truncate">&ldquo;{transcript}&rdquo;</span>
          </div>
        </div>

        {/* Command Options */}
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {allCommands.map((cmd, index) => (
            <CommandOption
              key={`${cmd.action}-${index}`}
              command={cmd}
              isSelected={index === selectedIndex}
              index={index}
              onSelect={setSelectedIndex}
              onExecute={onExecute}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">1-5</kbd> to select
              <span className="mx-2">|</span>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Enter</kbd> to execute
              <span className="mx-2">|</span>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">Esc</kbd> to cancel
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center gap-1.5"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={() => allCommands[selectedIndex] && onExecute(allCommands[selectedIndex])}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-1.5"
              >
                <Check size={14} />
                Execute
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar for auto-select */}
        {autoSelectTimeout > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
              style={{
                width: `${(timeRemaining / (autoSelectTimeout / 1000)) * 100}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline disambiguation (for smaller screens or embedded use)
 */
export function VoiceDisambiguationInline({
  transcript,
  primaryCommand,
  alternatives,
  onSelect,
  onCancel
}) {
  const allCommands = [primaryCommand, ...alternatives].filter(Boolean);

  if (allCommands.length === 0) return null;

  return (
    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle size={14} className="text-yellow-400" />
        <span className="text-xs text-yellow-400 font-medium">
          Did you mean one of these?
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-2 truncate">
        &ldquo;{transcript}&rdquo;
      </p>

      <div className="space-y-1">
        {allCommands.slice(0, 4).map((cmd, index) => (
          <button
            key={`${cmd.action}-${index}`}
            onClick={() => onSelect(cmd)}
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-white/10 flex items-center gap-2 group"
          >
            <span className="text-gray-400 w-4">{index + 1}.</span>
            <span className="text-white flex-1 truncate">{cmd.description}</span>
            <span className="text-gray-500 text-[10px]">
              {formatConfidence(cmd.confidence)}
            </span>
            <ArrowRight
              size={12}
              className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="mt-2 w-full text-xs text-gray-500 hover:text-gray-400 py-1"
      >
        Cancel
      </button>
    </div>
  );
}

export default VoiceDisambiguationDialog;
