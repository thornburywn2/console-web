/**
 * Session Replay Component
 * Playback terminal history with controls
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { sessionHistoryApi } from '../services/api.js';

export default function SessionReplay({
  sessionId,
  history,
  isOpen,
  onClose,
}) {
  const [events, setEvents] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [displayedContent, setDisplayedContent] = useState('');
  const terminalRef = useRef(null);
  const playIntervalRef = useRef(null);

  // Load events from history or fetch
  useEffect(() => {
    if (history && history.length > 0) {
      setEvents(history);
    } else if (sessionId && isOpen) {
      fetchHistory();
    }
  }, [sessionId, history, isOpen]);

  const fetchHistory = async () => {
    try {
      const data = await sessionHistoryApi.getHistory(sessionId);
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  // Build content up to index
  const buildContent = useCallback((upToIndex) => {
    let content = '';
    for (let i = 0; i <= upToIndex && i < events.length; i++) {
      const event = events[i];
      if (event.type === 'input' || event.type === 'command') {
        content += '$ ' + event.data + '\n';
      } else if (event.type === 'output') {
        content += event.data;
        if (!event.data.endsWith('\n')) content += '\n';
      }
    }
    return content;
  }, [events]);

  // Update display when index changes
  useEffect(() => {
    if (events.length > 0) {
      setDisplayedContent(buildContent(currentIndex));
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }
  }, [currentIndex, events, buildContent]);

  // Play/pause functionality
  useEffect(() => {
    if (playing && currentIndex < events.length - 1) {
      const currentEvent = events[currentIndex];
      const nextEvent = events[currentIndex + 1];

      // Calculate delay based on timestamps
      let delay = 100;
      if (currentEvent.timestamp && nextEvent.timestamp) {
        delay = Math.min(
          Math.max((nextEvent.timestamp - currentEvent.timestamp) / speed, 50),
          2000 / speed
        );
      }

      playIntervalRef.current = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, delay);
    } else if (currentIndex >= events.length - 1) {
      setPlaying(false);
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [playing, currentIndex, events, speed]);

  // Controls
  const play = () => setPlaying(true);
  const pause = () => setPlaying(false);
  const reset = () => {
    setPlaying(false);
    setCurrentIndex(0);
  };
  const stepForward = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  const stepBackward = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  const goToStart = () => setCurrentIndex(0);
  const goToEnd = () => setCurrentIndex(events.length - 1);

  // Seek to position
  const handleSeek = (e) => {
    const progress = e.target.value / 100;
    setCurrentIndex(Math.floor(progress * (events.length - 1)));
  };

  // Format time
  const formatTime = (index) => {
    if (events.length === 0) return '0:00';
    const event = events[index];
    if (event?.timestamp) {
      const totalSeconds = Math.floor((event.timestamp - events[0].timestamp) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return minutes + ':' + seconds.toString().padStart(2, '0');
    }
    return '0:00';
  };

  if (!isOpen) return null;

  const progress = events.length > 1 ? (currentIndex / (events.length - 1)) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-primary">Session Replay</span>
            <span className="text-xs text-muted">({events.length} events)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Terminal display */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-auto p-4 font-mono text-sm"
          style={{ background: '#1a1a2e', color: '#e0e0e0' }}
        >
          {events.length === 0 ? (
            <div className="text-center text-muted py-8">No events to replay</div>
          ) : (
            <pre className="whitespace-pre-wrap">{displayedContent}</pre>
          )}
          {playing && (
            <span className="inline-block w-2 h-4 bg-accent animate-pulse" />
          )}
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2" style={{ background: 'var(--bg-tertiary)' }}>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{formatTime(currentIndex)}</span>
            <span>Event {currentIndex + 1} of {events.length}</span>
            <span>{formatTime(events.length - 1)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 p-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Go to start */}
          <button onClick={goToStart} className="p-2 text-muted hover:text-primary" title="Go to start">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Step backward */}
          <button onClick={stepBackward} className="p-2 text-muted hover:text-primary" title="Step back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={playing ? pause : play}
            className="p-3 rounded-full bg-accent text-white hover:bg-accent/80"
          >
            {playing ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            )}
          </button>

          {/* Step forward */}
          <button onClick={stepForward} className="p-2 text-muted hover:text-primary" title="Step forward">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Go to end */}
          <button onClick={goToEnd} className="p-2 text-muted hover:text-primary" title="Go to end">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          {/* Speed control */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-muted">Speed:</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>
          </div>

          {/* Reset */}
          <button onClick={reset} className="ml-4 px-3 py-1 text-xs text-muted hover:text-primary" title="Reset">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
