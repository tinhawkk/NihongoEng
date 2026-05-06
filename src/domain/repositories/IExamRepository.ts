import { JLPTExam, JLPTMondai, JLPTQuestion } from "../../types/exam";

export interface IExamRepository {
  getExamsByLevel(): Promise<Record<string, JLPTExam[]>>;
  getExamWithQuestions(examId: string): Promise<JLPTExam | null>;
  updateQuestionExplanation(questionId: string, explanation: string): Promise<JLPTQuestion | null>;
  uploadExam(examData: Partial<JLPTExam>): Promise<{ id: string } | null>;
  getExamByDeckId(deckId: string): Promise<{ id: string; title: string; existingMondais: number[] } | null>;
  addMondaisToExam(examId: string, mondais: Partial<JLPTMondai>[]): Promise<{ affected_rows: number } | null>;
  saveGeneratedExam(examData: Partial<JLPTExam>): Promise<{ id: string } | null>;
  deleteExam(examId: string): Promise<{ id: string } | null>;
  deleteMondai(mondaiId: string): Promise<{ id: string } | null>;
  updateMondai(mondaiId: string, updates: Partial<JLPTMondai>): Promise<JLPTMondai | null>;
  updateQuestion(questionId: string, updates: Partial<JLPTQuestion>): Promise<JLPTQuestion | null>;
}
