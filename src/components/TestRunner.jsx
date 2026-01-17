/**
 * Test Runner Component
 * Run and visualize test results
 *
 * Phase 5.1: Migrated from direct fetch() to centralized API service
 */

import { useState, useEffect, useRef } from 'react';
import { testsApi } from '../services/api.js';

const STATUS_COLORS = {
  passed: '#2ecc71',
  failed: '#e74c3c',
  skipped: '#f39c12',
  pending: '#3498db',
  running: '#9b59b6',
};

function TestItem({ test, depth = 0 }) {
  const [expanded, setExpanded] = useState(test.status === 'failed');
  const hasChildren = test.tests && test.tests.length > 0;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={'flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer ' +
          (test.status === 'failed' ? 'bg-red-500/10' : '')}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/collapse for suites */}
        {hasChildren && (
          <svg
            className={'w-3 h-3 text-muted transition-transform ' + (expanded ? 'rotate-90' : '')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {!hasChildren && <span className="w-3" />}

        {/* Status icon */}
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: STATUS_COLORS[test.status] }}
        >
          {test.status === 'passed' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {test.status === 'failed' && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {test.status === 'running' && (
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </div>

        {/* Test name */}
        <span className={'flex-1 text-sm truncate ' +
          (test.status === 'failed' ? 'text-red-400' : 'text-secondary')}>
          {test.name}
        </span>

        {/* Duration */}
        {test.duration !== undefined && (
          <span className="text-xs text-muted">{test.duration}ms</span>
        )}
      </div>

      {/* Error message */}
      {test.status === 'failed' && test.error && (
        <div
          className="mx-2 my-1 p-2 rounded text-xs font-mono overflow-auto"
          style={{ background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', maxHeight: 150 }}
        >
          <pre className="whitespace-pre-wrap">{test.error}</pre>
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {test.tests.map((child, i) => (
            <TestItem key={i} test={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CoverageBar({ coverage }) {
  const percentage = coverage?.percentage || 0;
  const color = percentage >= 80 ? '#2ecc71' : percentage >= 50 ? '#f39c12' : '#e74c3c';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{coverage?.name || 'Coverage'}</span>
        <span style={{ color }}>{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function TestRunner({ projectPath, isOpen, onClose, embedded = false }) {
  const [status, setStatus] = useState('idle'); // idle, running, completed
  const [results, setResults] = useState(null);
  const [output, setOutput] = useState('');
  const [filter, setFilter] = useState('all'); // all, passed, failed
  const outputRef = useRef(null);

  const runTests = async () => {
    setStatus('running');
    setOutput('');
    setResults(null);

    try {
      const data = await testsApi.run(projectPath);
      setResults(data.results);
      setOutput(data.output || '');
      setStatus('completed');
    } catch (error) {
      console.error('Failed to run tests:', error.getUserMessage?.() || error.message);
      setStatus('idle');
    }
  };

  const runSingleTest = async (testName) => {
    setStatus('running');
    try {
      const data = await testsApi.run(projectPath, testName);
      setResults(data.results);
      setOutput(data.output || '');
      setStatus('completed');
    } catch (error) {
      console.error('Failed to run test:', error.getUserMessage?.() || error.message);
      setStatus('completed');
    }
  };

  // Filter test suites
  const filterTests = (tests) => {
    if (!tests) return [];
    if (filter === 'all') return tests;

    return tests.map(suite => ({
      ...suite,
      tests: suite.tests?.filter(t =>
        filter === 'passed' ? t.status === 'passed' :
        filter === 'failed' ? t.status === 'failed' : true
      ),
    })).filter(suite => suite.tests?.length > 0 || suite.status === filter);
  };

  // Calculate totals
  const countTests = (tests) => {
    let passed = 0, failed = 0, skipped = 0;

    const count = (items) => {
      items?.forEach(item => {
        if (item.status === 'passed') passed++;
        else if (item.status === 'failed') failed++;
        else if (item.status === 'skipped') skipped++;
        if (item.tests) count(item.tests);
      });
    };

    count(tests);
    return { passed, failed, skipped, total: passed + failed + skipped };
  };

  const counts = countTests(results?.suites);

  if (!isOpen && !embedded) return null;

  // Embedded content for inline use
  const embeddedContent = (
    <div className="space-y-4">
      {/* Quick run button */}
      <button
        onClick={runTests}
        disabled={status === 'running'}
        className="w-full py-2 text-sm rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
      >
        {status === 'running' ? 'Running Tests...' : 'Run Tests'}
      </button>

      {/* Results summary */}
      {counts.total > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
            <div className="text-lg font-bold text-green-400">{counts.passed}</div>
            <div className="text-xs text-muted">Passed</div>
          </div>
          <div className="p-2 rounded" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="text-lg font-bold text-red-400">{counts.failed}</div>
            <div className="text-xs text-muted">Failed</div>
          </div>
          <div className="p-2 rounded" style={{ background: 'rgba(107, 114, 128, 0.2)' }}>
            <div className="text-lg font-bold text-gray-400">{counts.skipped}</div>
            <div className="text-xs text-muted">Skipped</div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      <div className="text-xs text-center text-muted">
        {status === 'idle' && 'No tests run yet'}
        {status === 'running' && 'Tests in progress...'}
        {status === 'completed' && `Completed: ${counts.total} tests`}
      </div>
    </div>
  );

  if (embedded) {
    return embeddedContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Test Runner</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-4 p-4"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={runTests}
            disabled={status === 'running'}
            className="flex items-center gap-2 px-4 py-2 rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50"
          >
            {status === 'running' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Run All Tests
              </>
            )}
          </button>

          {results && (
            <>
              <div className="flex-1" />

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span style={{ color: STATUS_COLORS.passed }}>
                  {counts.passed} passed
                </span>
                <span style={{ color: STATUS_COLORS.failed }}>
                  {counts.failed} failed
                </span>
                {counts.skipped > 0 && (
                  <span style={{ color: STATUS_COLORS.skipped }}>
                    {counts.skipped} skipped
                  </span>
                )}
                {results.duration && (
                  <span className="text-muted">{(results.duration / 1000).toFixed(2)}s</span>
                )}
              </div>

              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 text-sm rounded"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
              >
                <option value="all">All Tests</option>
                <option value="passed">Passed Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Test Results */}
          <div className="flex-1 overflow-auto p-4">
            {status === 'idle' && !results && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">Run tests to see results</div>
                <p className="text-muted">Click "Run All Tests" to start</p>
              </div>
            )}

            {status === 'running' && !results && (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted">Running tests...</p>
              </div>
            )}

            {results && (
              <div className="space-y-1">
                {filterTests(results.suites)?.map((suite, i) => (
                  <TestItem key={i} test={suite} />
                ))}
              </div>
            )}
          </div>

          {/* Coverage Panel */}
          {results?.coverage && (
            <div
              className="w-64 flex-shrink-0 p-4 overflow-auto"
              style={{ borderLeft: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-medium text-primary mb-3">Coverage</h3>
              <div className="space-y-3">
                <CoverageBar coverage={{ name: 'Statements', percentage: results.coverage.statements }} />
                <CoverageBar coverage={{ name: 'Branches', percentage: results.coverage.branches }} />
                <CoverageBar coverage={{ name: 'Functions', percentage: results.coverage.functions }} />
                <CoverageBar coverage={{ name: 'Lines', percentage: results.coverage.lines }} />
              </div>

              {/* Coverage Summary */}
              <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div
                  className="text-3xl font-bold"
                  style={{
                    color: results.coverage.lines >= 80 ? STATUS_COLORS.passed :
                           results.coverage.lines >= 50 ? STATUS_COLORS.skipped :
                           STATUS_COLORS.failed
                  }}
                >
                  {results.coverage.lines?.toFixed(0)}%
                </div>
                <div className="text-xs text-muted">Overall Coverage</div>
              </div>
            </div>
          )}
        </div>

        {/* Output */}
        {output && (
          <div
            ref={outputRef}
            className="max-h-40 overflow-auto p-4 font-mono text-xs"
            style={{ background: '#1a1a2e', borderTop: '1px solid var(--border-subtle)' }}
          >
            <pre className="whitespace-pre-wrap text-muted">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
