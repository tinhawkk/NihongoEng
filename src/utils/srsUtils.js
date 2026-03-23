/**
 * SRS SM-2 Utility (v2 - Anki-accurate)
 * Centralized, refined logic for Spaced Repetition System calculations.
 */

export const SRS_STEPS = [1, 10]; // Minutes - Initial learning steps
export const GRADUATING_INTERVAL = 1; // Days after passing learning steps
export const EASY_INTERVAL = 4; // Days for Easy on first card
export const MAX_INTERVAL = 365; // Max interval in days (1 year)
export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
export const EASY_BONUS = 1.3;

/**
 * Maturity classification (matches Anki's categories)
 * - New: never reviewed (interval = 0, stepIndex = 0, no nextReview or nextReview is future)
 * - Learning: in initial learning steps (interval = 0)
 * - Young: graduated but interval < 21 days
 * - Mature: interval >= 21 days (proven long-term memory)
 */
export function getCardCategory(item) {
  if (!item) return 'new';
  if (!item.nextReview || item.reviews === 0) return 'new';
  if (item.interval === 0) return 'learning';
  if (item.interval < 21) return 'young';
  return 'mature';
}

export const CATEGORY_LABELS = {
  new: { label: 'Mới', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', dot: 'bg-blue-400' },
  learning: { label: 'Đang học', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', dot: 'bg-orange-400' },
  young: { label: 'Quen', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-400' },
  mature: { label: 'Thuộc lòng', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', dot: 'bg-purple-400' },
};

/**
 * Calculates the next SRS state based on user rating.
 * Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 *
 * Follows Anki's SM-2 implementation closely:
 * - New/Learning cards: step-based (minutes)
 * - Review cards: interval-based (days)
 */
export function calculateNextSrs(item, rating) {
  let {
    interval = 0,
    ease = DEFAULT_EASE,
    reviews = 0,
    stepIndex = 0,
  } = item || {};

  const now = new Date();
  let nextReview = new Date();

  // ── Learning Phase (interval === 0) ──────────────────────────
  if (interval === 0) {
    if (rating === 0) {
      // AGAIN: restart learning
      stepIndex = 0;
      nextReview.setMinutes(now.getMinutes() + SRS_STEPS[0]);
    } else if (rating === 3) {
      // EASY: graduate immediately with easy interval
      interval = EASY_INTERVAL;
      ease = Math.min(3.0, ease + 0.15);
      reviews++;
      nextReview.setDate(now.getDate() + interval);
    } else if (rating === 2) {
      // GOOD: advance to next step or graduate
      stepIndex++;
      if (stepIndex >= SRS_STEPS.length) {
        // Graduate!
        interval = GRADUATING_INTERVAL;
        reviews++;
        nextReview.setDate(now.getDate() + interval);
      } else {
        nextReview.setMinutes(now.getMinutes() + SRS_STEPS[stepIndex]);
      }
    } else {
      // HARD: stay at current step
      nextReview.setMinutes(now.getMinutes() + SRS_STEPS[stepIndex]);
    }
  }
  // ── Review Phase ───────────────────────────────────────────────
  else {
    reviews++;
    if (rating === 0) {
      // AGAIN: lapse - reset to learning, severe ease penalty
      ease = Math.max(MIN_EASE, ease - 0.2);
      interval = Math.max(1, Math.floor(interval * 0.5));
      stepIndex = 0;
      // Short relearn step before review interval
      nextReview.setMinutes(now.getMinutes() + SRS_STEPS[0]);
    } else {
      let newInterval;
      if (rating === 1) {
        // HARD: small growth, ease penalty
        newInterval = Math.round(interval * 1.2);
        ease = Math.max(MIN_EASE, ease - 0.15);
      } else if (rating === 2) {
        // GOOD: standard SM-2 growth
        newInterval = Math.round(interval * ease);
      } else {
        // EASY: bonus growth, ease reward
        newInterval = Math.round(interval * ease * EASY_BONUS);
        ease = Math.min(3.0, ease + 0.15);
      }

      // Ensure minimum progress (+1 day at least)
      interval = Math.min(
        MAX_INTERVAL,
        Math.max(interval + 1, newInterval)
      );
      nextReview.setDate(now.getDate() + interval);
    }
  }

  return {
    interval,
    ease: Math.round(ease * 100) / 100, // round to 2 decimal
    reviews,
    stepIndex,
    nextReview: nextReview.toISOString(),
    lastRated: rating,
    updatedAt: now.toISOString(),
  };
}

/**
 * Filter items that are due for review right now.
 */
export function getDueItems(srsData) {
  if (!srsData) return [];
  const now = new Date();
  return Object.values(srsData).filter(item => {
    if (!item.nextReview) return false;
    return new Date(item.nextReview) <= now;
  });
}

/**
 * Get items that have never been reviewed (brand new).
 */
export function getNewItems(srsData) {
  if (!srsData) return [];
  return Object.values(srsData).filter(item => getCardCategory(item) === 'new');
}

/**
 * Get items currently in learning steps (interval=0 but already seen once).
 */
export function getLearningItems(srsData) {
  if (!srsData) return [];
  return Object.values(srsData).filter(item => getCardCategory(item) === 'learning');
}

/**
 * Estimates human-readable next interval preview for each rating button.
 */
export function getNextIntervalLabel(item, rating) {
  const result = calculateNextSrs(item, rating);
  const diffMs = new Date(result.nextReview) - new Date();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) return `<1m`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.round(diffMin / 60)}h`;

  const diffDays = Math.round(diffMin / 1440);
  if (diffDays >= 30) return `${Math.round(diffDays / 30)}th`;
  return `${diffDays}n`;
}

/**
 * Format current interval into human readable string.
 */
export function formatInterval(item) {
  if (!item || !item.nextReview || getCardCategory(item) === 'new') return 'Chưa học';
  if (item.interval === 0) return `${SRS_STEPS[item.stepIndex ?? 0]}m`;
  if (item.interval === 1) return '1 ngày';
  return `${item.interval} ngày`;
}
