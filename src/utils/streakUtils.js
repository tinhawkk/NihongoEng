/**
 * Calculates the current consecutive streak from an array of dates.
 * @param {string[]} dates - Array of dates in 'en-CA' format (YYYY-MM-DD)
 * @returns {number} The current consecutive streak
 */
export function calculateCurrentStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  // Sort dates in descending order
  const sortedDates = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA");

  let streak = 0;
  let currentDate = today;

  // If today isn't studied, check if yesterday was. 
  // If yesterday wasn't either, streak is 0.
  if (!sortedDates.includes(today)) {
    if (sortedDates.includes(yesterdayStr)) {
      currentDate = yesterdayStr;
    } else {
      return 0;
    }
  }

  // Iterate backwards and count consecutive days
  let checkDate = new Date(currentDate);
  while (true) {
    const dateStr = checkDate.toLocaleDateString("en-CA");
    if (sortedDates.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculates the total number of unique study days.
 */
export function calculateTotalDays(dates) {
  return new Set(dates).size;
}
