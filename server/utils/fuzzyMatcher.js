/**
 * Fuzzy String Matching Utilities
 * P0 Phase 2: Enhanced Pattern Matching
 *
 * Provides Levenshtein distance, string similarity, and fuzzy matching
 * for improved voice command recognition.
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity score (0-1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score 0-1
 */
export function stringSimilarity(a, b) {
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(
    longer.toLowerCase(),
    shorter.toLowerCase()
  );

  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Jaro-Winkler similarity (better for short strings)
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Similarity score 0-1
 */
export function jaroWinklerSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + 0.1 * prefix * (1 - jaro);
}

/**
 * Check if strings contain similar words
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} threshold - Similarity threshold per word
 * @returns {number} Word overlap score 0-1
 */
export function wordOverlapSimilarity(a, b, threshold = 0.8) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  let matches = 0;
  const usedB = new Set();

  for (const wordA of wordsA) {
    for (let i = 0; i < wordsB.length; i++) {
      if (usedB.has(i)) continue;

      const similarity = stringSimilarity(wordA, wordsB[i]);
      if (similarity >= threshold) {
        matches++;
        usedB.add(i);
        break;
      }
    }
  }

  return matches / Math.max(wordsA.length, wordsB.length);
}

/**
 * Phonetic similarity using Soundex-like algorithm
 * @param {string} s - Input string
 * @returns {string} Phonetic code
 */
export function phoneticCode(s) {
  if (!s) return '';

  s = s.toUpperCase();
  const firstLetter = s[0];

  const codes = {
    B: 1, F: 1, P: 1, V: 1,
    C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
    D: 3, T: 3,
    L: 4,
    M: 5, N: 5,
    R: 6
  };

  let result = firstLetter;
  let prevCode = codes[firstLetter] || '';

  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]];
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    } else if (!code) {
      prevCode = '';
    }
  }

  return result.padEnd(4, '0');
}

/**
 * Check phonetic similarity between strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} Whether strings sound similar
 */
export function soundsSimilar(a, b) {
  const wordsA = a.split(/\s+/).map(phoneticCode);
  const wordsB = b.split(/\s+/).map(phoneticCode);

  let matches = 0;
  for (const codeA of wordsA) {
    if (wordsB.includes(codeA)) matches++;
  }

  return matches / Math.max(wordsA.length, wordsB.length) > 0.5;
}

/**
 * Combined fuzzy match score using multiple algorithms
 * @param {string} input - User input
 * @param {string} target - Target phrase to match
 * @returns {Object} Match result with score and method
 */
export function fuzzyMatch(input, target) {
  const inputLower = input.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();

  // Exact match
  if (inputLower === targetLower) {
    return { score: 1.0, method: 'exact' };
  }

  // Contains check
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower)) {
    const containsScore = Math.min(inputLower.length, targetLower.length) /
                          Math.max(inputLower.length, targetLower.length);
    return { score: Math.min(0.95, containsScore + 0.1), method: 'contains' };
  }

  // String similarity (Levenshtein-based)
  const levScore = stringSimilarity(inputLower, targetLower);

  // Jaro-Winkler (good for short strings and typos)
  const jwScore = jaroWinklerSimilarity(inputLower, targetLower);

  // Word overlap (good for reordered words)
  const wordScore = wordOverlapSimilarity(inputLower, targetLower);

  // Phonetic similarity check
  const phonetic = soundsSimilar(inputLower, targetLower);

  // Weighted combination
  let score = levScore * 0.3 + jwScore * 0.4 + wordScore * 0.3;

  // Boost for phonetic match
  if (phonetic) {
    score = Math.min(1, score + 0.1);
  }

  const method = jwScore > levScore && jwScore > wordScore ? 'jaro-winkler' :
                 levScore > wordScore ? 'levenshtein' : 'word-overlap';

  return { score, method };
}

/**
 * Find best fuzzy matches from a list of candidates
 * @param {string} input - User input
 * @param {Array} candidates - Array of candidate strings or objects
 * @param {Object} options - Options for matching
 * @returns {Array} Sorted matches with scores
 */
export function findBestMatches(input, candidates, options = {}) {
  const {
    key = null,           // Property key if candidates are objects
    threshold = 0.5,      // Minimum score threshold
    limit = 5,            // Maximum results
    includeMethod = false // Include match method in results
  } = options;

  const results = [];

  for (const candidate of candidates) {
    const target = key ? candidate[key] : candidate;
    if (!target) continue;

    const { score, method } = fuzzyMatch(input, target);

    if (score >= threshold) {
      results.push({
        candidate,
        score,
        ...(includeMethod && { method })
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}

/**
 * Smart command suggestion based on partial input
 * @param {string} input - Partial user input
 * @param {Array} commands - Array of command objects
 * @returns {Array} Suggested commands with scores
 */
export function suggestCommands(input, commands) {
  if (!input || input.length < 2) return [];

  const results = [];

  for (const cmd of commands) {
    // Check description
    const descMatch = fuzzyMatch(input, cmd.description || '');

    // Check action name
    const actionMatch = fuzzyMatch(
      input,
      (cmd.action || '').replace(/-/g, ' ')
    );

    // Check examples
    let exampleScore = 0;
    if (cmd.examples) {
      for (const example of cmd.examples) {
        const match = fuzzyMatch(input, example);
        exampleScore = Math.max(exampleScore, match.score);
      }
    }

    // Best score across all checks
    const bestScore = Math.max(descMatch.score, actionMatch.score, exampleScore);

    if (bestScore >= 0.4) {
      results.push({
        ...cmd,
        matchScore: bestScore,
        matchType: descMatch.score === bestScore ? 'description' :
                   actionMatch.score === bestScore ? 'action' : 'example'
      });
    }
  }

  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8);
}

export default {
  levenshteinDistance,
  stringSimilarity,
  jaroWinklerSimilarity,
  wordOverlapSimilarity,
  phoneticCode,
  soundsSimilar,
  fuzzyMatch,
  findBestMatches,
  suggestCommands
};
