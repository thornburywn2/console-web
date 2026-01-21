/**
 * AdminNav - Vertical Navigation Sidebar for Admin Dashboard
 * Matches the clean, cohesive design of LeftSidebar
 *
 * Features:
 * - Vertical navigation with collapsible sections
 * - RBAC-filtered navigation items
 * - Persistent section states
 * - SVG icons throughout
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  TABS,
  SERVER_TABS,
  SECURITY_TABS,
  AUTOMATION_TABS,
  SETTINGS_TABS,
  canAccessTab,
  canAccessServerTab,
  canAccessSecurityTab,
} from './constants';

const STORAGE_KEY = 'cw-admin-nav-sections';

// Load persisted section states
function loadSectionStates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Save section states
function saveSectionStates(states) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

// SVG Icons
const Icons = {
  folder: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  robot: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
  server: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  ),
  shield: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  wrench: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  ),
  dog: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H3.75a.75.75 0 01-.75-.75v-3.25a.75.75 0 01.75-.75h3.126c.617 0 1.216-.23 1.604-.729.04-.05.08-.098.121-.148" />
    </svg>
  ),
  cat: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
    </svg>
  ),
  bee: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  docker: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  services: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  ),
  stack: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  ),
  package: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  log: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  process: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
  network: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  key: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  ),
  fire: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  ),
  puzzle: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
    </svg>
  ),
  scan: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  observe: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

/**
 * NavSection - Collapsible navigation section
 */
function NavSection({ id, title, icon, children, defaultExpanded = true }) {
  const [states, setStates] = useState(() => loadSectionStates());
  const expanded = states[id] ?? defaultExpanded;

  const toggle = useCallback(() => {
    const newStates = { ...states, [id]: !expanded };
    setStates(newStates);
    saveSectionStates(newStates);
  }, [id, expanded, states]);

  return (
    <div className="py-1">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {icon && <span className="opacity-60">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
      </button>
      {expanded && <div className="py-1">{children}</div>}
    </div>
  );
}

/**
 * NavItem - Navigation item
 */
function NavItem({ label, icon, isActive, onClick, badge, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md text-left
        transition-colors duration-150
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'
          : disabled
            ? ''
            : 'hover:bg-white/5 text-[var(--text-secondary)]'
        }
      `}
    >
      {icon && <span className={`flex-shrink-0 ${isActive ? '' : 'opacity-60'}`}>{icon}</span>}
      <span className="flex-1 text-sm font-mono truncate">{label}</span>
      {badge !== undefined && (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * AdminNav - Main Navigation Sidebar
 */
export default function AdminNav({
  activeTab,
  activeSubTab,
  onTabChange,
  onSubTabChange,
  showExperimentalFeatures = false,
  onClose,
}) {
  const { hasRole } = useAuth();

  return (
    <aside className="w-52 h-full flex-shrink-0 flex flex-col bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold text-[var(--accent-primary)] font-mono tracking-wide">
          ADMIN
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        {/* Main Section */}
        <NavSection id="admin-main" title="Main" defaultExpanded={true}>
          <NavItem
            label="Projects"
            icon={Icons.folder}
            isActive={activeTab === TABS.PROJECTS}
            onClick={() => onTabChange(TABS.PROJECTS)}
          />
          <NavItem
            label="Settings"
            icon={Icons.settings}
            isActive={activeTab === TABS.SETTINGS}
            onClick={() => onTabChange(TABS.SETTINGS)}
          />
          <NavItem
            label="History"
            icon={Icons.clock}
            isActive={activeTab === TABS.HISTORY}
            onClick={() => onTabChange(TABS.HISTORY)}
          />
        </NavSection>

        {/* Automation Section */}
        <NavSection id="admin-automation" title="Automation" defaultExpanded={true}>
          <NavItem
            label="Agents"
            icon={Icons.robot}
            isActive={activeTab === TABS.AUTOMATION && activeSubTab === AUTOMATION_TABS.AGENTS}
            onClick={() => { onTabChange(TABS.AUTOMATION); onSubTabChange?.(AUTOMATION_TABS.AGENTS); }}
          />
          <NavItem
            label="MCP Servers"
            icon={Icons.puzzle}
            isActive={activeTab === TABS.AUTOMATION && activeSubTab === AUTOMATION_TABS.MCP}
            onClick={() => { onTabChange(TABS.AUTOMATION); onSubTabChange?.(AUTOMATION_TABS.MCP); }}
          />
        </NavSection>

        {/* Server Section - Admin only */}
        {canAccessTab(TABS.SERVER, hasRole) && (
          <NavSection id="admin-server" title="Server" icon={Icons.server} defaultExpanded={activeTab === TABS.SERVER}>
            <NavItem
              label="Overview"
              icon={Icons.chart}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.OVERVIEW}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.OVERVIEW); }}
            />
            <NavItem
              label="Services"
              icon={Icons.services}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.SERVICES}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.SERVICES); }}
            />
            <NavItem
              label="Docker"
              icon={Icons.docker}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.DOCKER}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.DOCKER); }}
            />
            <NavItem
              label="Stack"
              icon={Icons.stack}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.STACK}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.STACK); }}
            />
            <NavItem
              label="Observability"
              icon={Icons.observe}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.OBSERVABILITY}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.OBSERVABILITY); }}
            />
            <NavItem
              label="Packages"
              icon={Icons.package}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.PACKAGES}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.PACKAGES); }}
              disabled={!canAccessServerTab(SERVER_TABS.PACKAGES, hasRole)}
            />
            <NavItem
              label="Logs"
              icon={Icons.log}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.LOGS}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.LOGS); }}
            />
            <NavItem
              label="Processes"
              icon={Icons.process}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.PROCESSES}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.PROCESSES); }}
              disabled={!canAccessServerTab(SERVER_TABS.PROCESSES, hasRole)}
            />
            <NavItem
              label="Network"
              icon={Icons.network}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.NETWORK}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.NETWORK); }}
            />
            <NavItem
              label="Scheduled"
              icon={Icons.calendar}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.SCHEDULED}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.SCHEDULED); }}
            />
            <NavItem
              label="Authentik"
              icon={Icons.key}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.AUTHENTIK}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.AUTHENTIK); }}
              disabled={!canAccessServerTab(SERVER_TABS.AUTHENTIK, hasRole)}
            />
            <NavItem
              label="Users"
              icon={Icons.users}
              isActive={activeTab === TABS.SERVER && activeSubTab === SERVER_TABS.USERS}
              onClick={() => { onTabChange(TABS.SERVER); onSubTabChange?.(SERVER_TABS.USERS); }}
              disabled={!canAccessServerTab(SERVER_TABS.USERS, hasRole)}
            />
          </NavSection>
        )}

        {/* Security Section - Admin only */}
        {canAccessTab(TABS.SECURITY, hasRole) && (
          <NavSection id="admin-security" title="Security" icon={Icons.shield} defaultExpanded={activeTab === TABS.SECURITY}>
            <NavItem
              label="Scans"
              icon={Icons.scan}
              isActive={activeTab === TABS.SECURITY && activeSubTab === SECURITY_TABS.SCANS}
              onClick={() => { onTabChange(TABS.SECURITY); onSubTabChange?.(SECURITY_TABS.SCANS); }}
            />
            <NavItem
              label="Firewall"
              icon={Icons.fire}
              isActive={activeTab === TABS.SECURITY && activeSubTab === SECURITY_TABS.FIREWALL}
              onClick={() => { onTabChange(TABS.SECURITY); onSubTabChange?.(SECURITY_TABS.FIREWALL); }}
              disabled={!canAccessSecurityTab(SECURITY_TABS.FIREWALL, hasRole)}
            />
            <NavItem
              label="Fail2Ban"
              icon={Icons.shield}
              isActive={activeTab === TABS.SECURITY && activeSubTab === SECURITY_TABS.FAIL2BAN}
              onClick={() => { onTabChange(TABS.SECURITY); onSubTabChange?.(SECURITY_TABS.FAIL2BAN); }}
              disabled={!canAccessSecurityTab(SECURITY_TABS.FAIL2BAN, hasRole)}
            />
            <NavItem
              label="Config"
              icon={Icons.settings}
              isActive={activeTab === TABS.SECURITY && activeSubTab === SECURITY_TABS.SCAN_CONFIG}
              onClick={() => { onTabChange(TABS.SECURITY); onSubTabChange?.(SECURITY_TABS.SCAN_CONFIG); }}
            />
          </NavSection>
        )}

        {/* Experimental Section */}
        {showExperimentalFeatures && (
          <NavSection id="admin-experimental" title="Experimental" defaultExpanded={false}>
            <NavItem
              label="Dev Tools"
              icon={Icons.wrench}
              isActive={activeTab === TABS.DEVELOPMENT}
              onClick={() => onTabChange(TABS.DEVELOPMENT)}
            />
            <NavItem
              label="Code Puppy"
              icon={Icons.dog}
              isActive={activeTab === TABS.CODE_PUPPY}
              onClick={() => onTabChange(TABS.CODE_PUPPY)}
            />
            {canAccessTab(TABS.TABBY, hasRole) && (
              <NavItem
                label="Tabby"
                icon={Icons.cat}
                isActive={activeTab === TABS.TABBY}
                onClick={() => onTabChange(TABS.TABBY)}
              />
            )}
            {canAccessTab(TABS.SWARM, hasRole) && (
              <NavItem
                label="Swarm"
                icon={Icons.bee}
                isActive={activeTab === TABS.SWARM}
                onClick={() => onTabChange(TABS.SWARM)}
              />
            )}
          </NavSection>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-muted)]">
        v1.0.27
      </div>
    </aside>
  );
}
