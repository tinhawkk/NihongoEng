/**
 * Calculates the Levenshtein distance between two strings.
 * Used for typo detection (Fuzzy Matching).
 */
export function getLevenshteinDistance(s1, s2) {
  if (!s1 || !s2) return Math.max(s1?.length || 0, s2?.length || 0);

  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();

  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return track[str2.length][str1.length];
}

/**
 * Checks if a string is a "typo" of another.
 * Criteria: Distance is 1 for words > 3 chars, or 2 for words > 7 chars.
 */
export function isTypo(given, target) {
  const dist = getLevenshteinDistance(given, target);
  if (dist === 0) return false;
  if (target.length > 7) return dist <= 2;
  if (target.length > 3) return dist === 1;
  return false;
}
