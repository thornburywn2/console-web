/**
 * Prompt Library Constants
 */

export const API_BASE = '/api/prompts';

// Extract variables from content
export const extractVariables = (content) => {
  const matches = content.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
};
