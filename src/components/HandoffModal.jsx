/**
 * Handoff Modal Component
 * Transfer session ownership to another team member
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect } from 'react';
import { teamApi, sessionHandoffApi } from '../services/api.js';

const HANDOFF_REASONS = [
  { id: 'shift_end', label: 'End of Shift', icon: '🕐' },
  { id: 'expertise', label: 'Need Expertise', icon: '🎓' },
  { id: 'collaboration', label: 'Collaboration', icon: '🤝' },
  { id: 'vacation', label: 'Going Away', icon: '✈️' },
  { id: 'other', label: 'Other', icon: '📝' },
];

export default function HandoffModal({
  session,
  isOpen,
  onClose,
  onHandoff,
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [reason, setReason] = useState('shift_end');
  const [notes, setNotes] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState(1);

  // Fetch team members
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    try {
      const data = await teamApi.listMembers();
      setTeamMembers(data.members || []);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      // Demo data for development
      setTeamMembers([
        { id: '1', name: 'Alice Chen', email: 'alice@example.com', status: 'online', avatar: null },
        { id: '2', name: 'Bob Smith', email: 'bob@example.com', status: 'away', avatar: null },
        { id: '3', name: 'Charlie Davis', email: 'charlie@example.com', status: 'offline', avatar: null },
      ]);
    }
  };

  const handleHandoff = async () => {
    if (!selectedMember) return;

    setLoading(true);
    try {
      const data = await sessionHandoffApi.handoff(session.id, {
        toUserId: selectedMember,
        reason,
        notes,
        includeContext,
      });
      if (onHandoff) {
        onHandoff(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to hand off session:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMemberData = teamMembers.find(m => m.id === selectedMember);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#2ecc71';
      case 'away': return '#f39c12';
      case 'busy': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Hand Off Session</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-3" style={{ background: 'var(--bg-tertiary)' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ' +
                  (step >= s ? 'bg-accent text-white' : 'bg-white/10 text-muted')}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className="w-12 h-0.5"
                  style={{ background: step > s ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Select Team Member */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-2">Select Team Member</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-3 py-2 rounded text-sm mb-3"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
                <div className="space-y-2 max-h-60 overflow-auto">
                  {filteredMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member.id)}
                      className={'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ' +
                        (selectedMember === member.id
                          ? 'bg-accent/20 ring-1 ring-accent'
                          : 'hover:bg-white/5')}
                    >
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
                          style={{ background: 'var(--bg-tertiary)' }}
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                          ) : (
                            member.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                          style={{
                            background: getStatusColor(member.status),
                            borderColor: 'var(--bg-elevated)'
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-primary">{member.name}</div>
                        <div className="text-xs text-muted">{member.email}</div>
                      </div>
                      <span className="text-xs text-muted capitalize">{member.status}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="text-center text-muted py-4">
                      No team members found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Reason and Notes */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-secondary mb-2">Reason for Handoff</label>
                <div className="grid grid-cols-2 gap-2">
                  {HANDOFF_REASONS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className={'flex items-center gap-2 p-3 rounded-lg text-left ' +
                        (reason === r.id
                          ? 'bg-accent/20 ring-1 ring-accent'
                          : 'bg-white/5 hover:bg-white/10')}
                    >
                      <span className="text-lg">{r.icon}</span>
                      <span className="text-sm">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-secondary mb-2">Handoff Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add context for the next person..."
                  rows={4}
                  className="w-full px-3 py-2 rounded text-sm resize-none"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Review and Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">🤝</div>
                <h3 className="text-lg font-medium text-primary">Confirm Handoff</h3>
              </div>

              {/* Session Info */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-glass)' }}>
                <div className="text-xs text-muted mb-1">Session</div>
                <div className="font-medium text-primary">{session?.name || 'Terminal Session'}</div>
                <div className="text-sm text-secondary">{session?.projectPath}</div>
              </div>

              {/* Transfer Details */}
              <div className="flex items-center gap-4 justify-center py-4">
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-1"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    You
                  </div>
                  <div className="text-xs text-muted">Current Owner</div>
                </div>
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-1"
                    style={{ background: 'var(--accent-primary)', color: 'white' }}
                  >
                    {selectedMemberData?.name?.charAt(0) || '?'}
                  </div>
                  <div className="text-xs text-primary font-medium">{selectedMemberData?.name}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Reason:</span>
                  <span className="text-primary">
                    {HANDOFF_REASONS.find(r => r.id === reason)?.label}
                  </span>
                </div>
                {notes && (
                  <div>
                    <div className="text-muted mb-1">Notes:</div>
                    <div className="text-secondary text-xs p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                      {notes}
                    </div>
                  </div>
                )}
              </div>

              {/* Context Option */}
              <label className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeContext}
                  onChange={(e) => setIncludeContext(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-sm text-primary">Include Session Context</div>
                  <div className="text-xs text-muted">Share terminal history and environment state</div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-sm text-secondary hover:text-primary"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedMember}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleHandoff}
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
            >
              {loading ? 'Transferring...' : 'Confirm Handoff'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Handoff notification component for the receiving user
export function HandoffNotification({ handoff, onAccept, onDecline }) {
  if (!handoff) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-80 rounded-lg shadow-2xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: 'var(--accent-primary)' }}>
          🤝
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-primary">Session Handoff</h4>
          <p className="text-sm text-secondary mt-1">
            <span className="font-medium">{handoff.fromUser}</span> wants to hand off a session to you
          </p>
          <p className="text-xs text-muted mt-1">{handoff.sessionName}</p>
          {handoff.notes && (
            <p className="text-xs text-muted mt-2 p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              "{handoff.notes}"
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAccept}
              className="flex-1 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="flex-1 py-1.5 text-sm bg-white/10 hover:bg-white/20 rounded"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
