/**
 * SRS Scheduler (FSRS-6, Anki 23.10 defaults).
 * Uses Desired Retention instead of SM-2 tuning knobs.
 */

export const DESIRED_RETENTION = 0.9; // Anki default
export const LEARNING_STEPS = [1, 10]; // Minutes - Initial learning steps
export const RELEARN_STEPS = [10]; // Minutes - Relearning after lapse
export const MAX_INTERVAL = 365; // Max interval in days (1 year)
export const MIN_INTERVAL = 1; // Minimum interval in days
export const FSRS_PARAMS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
  0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542,
];

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MIN_STABILITY = 0.1;
const LEARNING_HARD_FACTOR = 1.2;
const DAY_MS = 86400000;
const W = FSRS_PARAMS;
const RETENTION_BASE = 0.9; // Stability is defined at 90% recall
const FACTOR = Math.pow(RETENTION_BASE, -1 / W[20]) - 1;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const addMinutes = (date, minutes) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const initStability = grade => W[Math.min(Math.max(grade, 1), 4) - 1];
const initDifficulty = grade =>
  clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);

const nextDifficulty = (difficulty, grade) => {
  const delta = -W[6] * (grade - 3);
  const d1 = difficulty + (delta * (10 - difficulty)) / 9;
  const d2 = W[7] * initDifficulty(4) + (1 - W[7]) * d1;
  return clamp(d2, MIN_DIFFICULTY, MAX_DIFFICULTY);
};

const retrievability = (elapsedDays, stability) => {
  const s = Math.max(stability, MIN_STABILITY);
  return Math.pow(1 + FACTOR * (elapsedDays / s), -W[20]);
};

const stabilitySuccess = (stability, difficulty, r, grade) => {
  const hardMul = grade === 2 ? W[15] : 1;
  const easyMul = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) * (11 - difficulty) * Math.pow(stability, -W[9]) *
      (Math.exp((1 - r) * W[10]) - 1) * hardMul * easyMul + 1;
  return Math.max(MIN_STABILITY, stability * growth);
};

const stabilityFail = (stability, difficulty, r) =>
  Math.max(
    MIN_STABILITY,
    W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r))
  );

const intervalFromStability = (stability, retention = DESIRED_RETENTION) => {
  const target = Math.max(0.01, Math.min(0.99, retention));
  const interval = stability * (Math.pow(target, -1 / W[20]) - 1) / FACTOR;
  return Math.max(MIN_INTERVAL, Math.round(interval));
};

const mapEaseToDifficulty = ease => {
  const minEase = 1.3;
  const maxEase = 3.0;
  const pct = (ease - minEase) / (maxEase - minEase);
  return clamp(10 - pct * 9, MIN_DIFFICULTY, MAX_DIFFICULTY);
};

const normalizeFsrsItem = (item, now) => {
  if (!item) {
    return {
      state: "learning",
      interval: 0,
      stepIndex: 0,
      stability: initStability(3),
      difficulty: initDifficulty(3),
      reps: 0,
      lapses: 0,
      lastReview: null,
    };
  }

  const interval = Number.isFinite(item.interval) ? item.interval : 0;
  const reps = item.reps ?? item.reviews ?? 0;
  const lapses = item.lapses ?? 0;
  const stepIndex = Number.isFinite(item.stepIndex) ? item.stepIndex : 0;
  const state = item.state || (interval > 0 ? "review" : "learning");
  const stability =
    item.stability ?? (interval > 0 ? Math.max(interval, MIN_STABILITY) : initStability(3));
  const difficulty =
    item.difficulty ?? (typeof item.ease === "number" ? mapEaseToDifficulty(item.ease) : initDifficulty(3));

  let lastReview = item.lastReview || item.updatedAt || null;
  if (!lastReview && item.nextReview && interval > 0) {
    lastReview = new Date(new Date(item.nextReview).getTime() - interval * DAY_MS).toISOString();
  }
  if (!lastReview) lastReview = now.toISOString();

  return { state, interval, stepIndex, stability, difficulty, reps, lapses, lastReview };
};

/**
 * Maturity classification (matches Anki's categories)
 * - New: never reviewed (interval = 0, stepIndex = 0, no nextReview or nextReview is future)
 * - Learning: in initial learning steps (interval = 0)
 * - Young: graduated but interval < 21 days
 * - Mature: interval >= 21 days (proven long-term memory)
 */
export function getCardCategory(item) {
  if (!item) return 'new';
  const reps = item.reps ?? item.reviews ?? 0;
  if (!item.nextReview || reps === 0) return 'new';
  if (item.state === 'learning' || item.state === 'relearning' || item.interval === 0) return 'learning';
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
 * Calculates the next FSRS state based on user rating.
 * Rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 * - Learning/Relearning steps are still used for same-day reviews.
 * - Review scheduling uses FSRS stability/difficulty and Desired Retention.
 */
export function calculateNextSrs(item, rating) {
  const grade = rating + 1;
  const now = new Date();
  const norm = normalizeFsrsItem(item, now);

  let { state, interval, stepIndex, stability, difficulty, reps, lapses, lastReview } = norm;
  const elapsedDays = lastReview ? Math.max(0, (now - new Date(lastReview)) / DAY_MS) : 0;
  const isFirstReview = reps === 0;

  if (isFirstReview) {
    stability = initStability(grade);
    difficulty = initDifficulty(grade);
  } else {
    const r = retrievability(elapsedDays, stability);
    difficulty = nextDifficulty(difficulty, grade);
    stability = grade === 1
      ? stabilityFail(stability, difficulty, r)
      : stabilitySuccess(stability, difficulty, r, grade);
  }

  let nextReview;
  let nextInterval = 0;
  let nextStepIndex = stepIndex;

  if (state === "review") {
    if (grade === 1) {
      lapses += 1;
      state = "relearning";
      nextStepIndex = 0;
      nextInterval = 0;
      nextReview = addMinutes(now, RELEARN_STEPS[0]);
    } else {
      state = "review";
      nextInterval = Math.min(MAX_INTERVAL, intervalFromStability(stability));
      nextReview = addDays(now, nextInterval);
      nextStepIndex = 0;
    }
  } else {
    const steps = state === "relearning" ? RELEARN_STEPS : LEARNING_STEPS;
    if (grade === 1) {
      nextStepIndex = 0;
      nextReview = addMinutes(now, steps[0]);
    } else if (grade === 2) {
      const hardStep = Math.max(1, Math.round(steps[nextStepIndex] * LEARNING_HARD_FACTOR));
      nextReview = addMinutes(now, hardStep);
    } else if (grade === 3) {
      nextStepIndex += 1;
      if (nextStepIndex >= steps.length) {
        state = "review";
        nextInterval = Math.min(MAX_INTERVAL, intervalFromStability(stability));
        nextReview = addDays(now, nextInterval);
        nextStepIndex = 0;
      } else {
        nextReview = addMinutes(now, steps[nextStepIndex]);
      }
    } else {
      state = "review";
      nextInterval = Math.min(MAX_INTERVAL, intervalFromStability(stability));
      nextReview = addDays(now, nextInterval);
      nextStepIndex = 0;
    }
  }

  reps += 1;

  return {
    state,
    stability: Math.round(stability * 1000) / 1000,
    difficulty: Math.round(difficulty * 1000) / 1000,
    interval: nextInterval,
    stepIndex: nextStepIndex,
    reps,
    lapses,
    nextReview: nextReview.toISOString(),
    lastReview: now.toISOString(),
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
  if (item.interval === 0) {
    const steps = item.state === 'relearning' ? RELEARN_STEPS : LEARNING_STEPS;
    return `${steps[item.stepIndex ?? 0] ?? steps[0]}m`;
  }
  if (item.interval === 1) return '1 ngày';
  return `${item.interval} ngày`;
}
