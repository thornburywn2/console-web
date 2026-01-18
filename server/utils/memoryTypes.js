/**
 * Memory Type Metadata Configuration
 *
 * Defines labels and descriptions for memory types.
 * Types are defined in Prisma schema (MemoryType enum) - this file
 * provides human-readable metadata for the UI.
 *
 * To add a new type:
 * 1. Add to Prisma schema (MemoryType enum)
 * 2. Run `npx prisma generate`
 * 3. Add entry here with label and description
 */

/**
 * Memory type metadata for UI display
 * Values must match the Prisma MemoryType enum
 */
export const MEMORY_TYPES = [
  {
    value: 'FACT',
    label: 'Fact',
    description: 'Factual information (e.g., "API endpoint is /api/v2")',
    icon: 'info',
    color: 'blue'
  },
  {
    value: 'INSTRUCTION',
    label: 'Instruction',
    description: 'How to do something (e.g., "Always use TypeScript strict mode")',
    icon: 'list-check',
    color: 'green'
  },
  {
    value: 'CONTEXT',
    label: 'Context',
    description: 'Background context (e.g., "User prefers minimal comments")',
    icon: 'book-open',
    color: 'purple'
  },
  {
    value: 'DECISION',
    label: 'Decision',
    description: 'Past decisions (e.g., "Chose React over Vue because...")',
    icon: 'git-branch',
    color: 'orange'
  },
  {
    value: 'LEARNING',
    label: 'Learning',
    description: 'Learned patterns (e.g., "This codebase uses X pattern")',
    icon: 'lightbulb',
    color: 'yellow'
  },
  {
    value: 'TODO',
    label: 'Todo',
    description: 'Pending items that need to be addressed',
    icon: 'check-circle',
    color: 'cyan'
  },
  {
    value: 'WARNING',
    label: 'Warning',
    description: 'Things to avoid or be careful about',
    icon: 'alert-triangle',
    color: 'red'
  }
];

/**
 * Memory scope metadata for UI display
 * Values must match the Prisma MemoryScope enum
 */
export const MEMORY_SCOPES = [
  {
    value: 'SESSION',
    label: 'Session',
    description: 'Short-term memory, deleted when session ends',
    icon: 'clock',
    color: 'gray'
  },
  {
    value: 'PROJECT',
    label: 'Project',
    description: 'Persistent per-project memory',
    icon: 'folder',
    color: 'blue'
  },
  {
    value: 'GLOBAL',
    label: 'Global',
    description: 'Cross-project memory, always available',
    icon: 'globe',
    color: 'green'
  }
];

/**
 * Get a memory type by value
 * @param {string} value - The type value (e.g., 'FACT')
 * @returns {object|undefined} The memory type metadata
 */
export function getMemoryType(value) {
  return MEMORY_TYPES.find(t => t.value === value);
}

/**
 * Get a memory scope by value
 * @param {string} value - The scope value (e.g., 'PROJECT')
 * @returns {object|undefined} The memory scope metadata
 */
export function getMemoryScope(value) {
  return MEMORY_SCOPES.find(s => s.value === value);
}

/**
 * Get all valid memory type values
 * @returns {string[]} Array of valid type values
 */
export function getMemoryTypeValues() {
  return MEMORY_TYPES.map(t => t.value);
}

/**
 * Get all valid memory scope values
 * @returns {string[]} Array of valid scope values
 */
export function getMemoryScopeValues() {
  return MEMORY_SCOPES.map(s => s.value);
}

export default {
  MEMORY_TYPES,
  MEMORY_SCOPES,
  getMemoryType,
  getMemoryScope,
  getMemoryTypeValues,
  getMemoryScopeValues
};
