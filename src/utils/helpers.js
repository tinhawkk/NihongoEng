export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomItems(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getPercentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function detectDeckLanguage(deckId, title = "") {
  if (!deckId && !title) return "japanese";
  const combined = `${deckId} ${title}`.toLowerCase();
  
  if (/(eng|ielts|toeic|toefl|cefr|english)/i.test(combined)) {
    return "english";
  }
  return "japanese";
}
