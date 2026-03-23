import Dexie, { type Table } from 'dexie';

export interface MasteryRecord {
  wordId: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
  correctCount: number;
  wrongCount: number;
  lastSeen: string;
  nextReview: string;
}

export class AppDatabase extends Dexie {
  mastery!: Table<MasteryRecord>;

  constructor() {
    super('KotoEduQuizDB');
    this.version(1).stores({
      mastery: 'wordId, status, nextReview'
    });
  }
}

export const db = new AppDatabase();
