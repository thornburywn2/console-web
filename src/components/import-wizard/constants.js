/**
 * ImportWizard Constants
 */

export const IMPORT_SOURCES = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '🤖',
    description: 'Import from OpenAI ChatGPT export',
    formats: ['json'],
    parser: 'chatgpt',
  },
  {
    id: 'claude',
    name: 'Claude',
    icon: '🧠',
    description: 'Import from Anthropic Claude export',
    formats: ['json'],
    parser: 'claude',
  },
  {
    id: 'generic',
    name: 'Generic JSON',
    icon: '📄',
    description: 'Import from generic JSON format',
    formats: ['json'],
    parser: 'generic',
  },
  {
    id: 'text',
    name: 'Plain Text',
    icon: '📝',
    description: 'Import from plain text file',
    formats: ['txt', 'md'],
    parser: 'text',
  },
  {
    id: 'terminal',
    name: 'Terminal Log',
    icon: '💻',
    description: 'Import terminal session log',
    formats: ['txt', 'log'],
    parser: 'terminal',
  },
];
