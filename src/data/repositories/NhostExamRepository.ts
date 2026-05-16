import { IExamRepository } from "../../domain/repositories/IExamRepository";
import { nhostService } from "../../services/nhostService";
import { JLPTExam, JLPTMondai, JLPTQuestion } from "../../types/exam";

export class NhostExamRepository implements IExamRepository {
  async getExamsByLevel(): Promise<Record<string, JLPTExam[]>> {
    const query = `
      query GetJLPTExams {
        jlpt_practice_exams(
          order_by: {level: asc, title: asc}
        ) {
          id
          title
          level
          url
          type
          is_listening
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(query, "GetJLPTExams", {});
    if (error) throw error;

    const grouped = (data?.jlpt_practice_exams || []).reduce((acc: Record<string, JLPTExam[]>, exam: any) => {
      const level = exam.level || "Unknown";
      if (!acc[level]) acc[level] = [];
      acc[level].push(exam);
      return acc;
    }, {});

    return grouped;
  }

  async getExamWithQuestions(examId: string): Promise<JLPTExam | null> {
    const query = `
      query GetExamWithQuestions($id: uuid!) {
        jlpt_practice_exams_by_pk(id: $id) {
          id
          title
          level
          mondais(order_by: {sort_order: asc}) {
            id
            mondai_number
            title
            instruction_text
            audio_url
            questions(order_by: {sort_order: asc}) {
              id
              question_text
              options
              correct_index
              sort_order
              explanation
              audio_url
              image_url
              is_mondai_header
            }
          }
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(query, "GetExamWithQuestions", {
      id: examId,
    });
    if (error) throw error;
    return data?.jlpt_practice_exams_by_pk || null;
  }

  async updateQuestionExplanation(questionId: string, explanation: string): Promise<JLPTQuestion | null> {
    const mutation = `
      mutation UpdateExplanation($id: uuid!, $explanation: String!) {
        update_jlpt_practice_questions_by_pk(pk_columns: {id: $id}, _set: {explanation: $explanation}) {
          id
          explanation
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "UpdateExplanation", {
      id: questionId,
      explanation,
    });
    if (error) throw error;
    return data?.update_jlpt_practice_questions_by_pk || null;
  }

  async uploadExam(examData: Partial<JLPTExam>): Promise<{ id: string } | null> {
    const mutation = `
      mutation InsertExam($object: jlpt_practice_exams_insert_input!) {
        insert_jlpt_practice_exams_one(object: $object) {
          id
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "InsertExam", {
      object: examData,
    });
    if (error) throw error;
    return data?.insert_jlpt_practice_exams_one || null;
  }

  async getExamByDeckId(deckId: string): Promise<{ id: string; title: string; existingMondais: number[] } | null> {
    const query = `
      query GetExamByDeck($deckId: String!) {
        jlpt_practice_exams(where: {source_deck_id: {_eq: $deckId}}, limit: 1) {
          id
          title
          mondais(order_by: {mondai_number: asc}) {
            mondai_number
          }
        }
      }
    `;
    const { data, errors } = await nhostService.fetchGraphQL(query, "GetExamByDeck", {
      deckId,
    });
    if (errors) {
      console.warn("[JLPT] getExamByDeckId error:", errors);
      return null;
    }
    const exams = data?.jlpt_practice_exams || [];
    if (exams.length === 0) return null;
    const exam = exams[0];
    return {
      id: exam.id,
      title: exam.title,
      existingMondais: (exam.mondais || []).map((m: any) => m.mondai_number),
    };
  }

  async addMondaisToExam(examId: string, mondais: Partial<JLPTMondai>[]): Promise<{ affected_rows: number } | null> {
    const mutation = `
      mutation AddMondais($objects: [jlpt_practice_mondais_insert_input!]!) {
        insert_jlpt_practice_mondais(objects: $objects) {
          affected_rows
        }
      }
    `;
    const objects = mondais.map(m => ({
      exam_id: examId,
      mondai_number: m.mondai_number,
      title: m.title,
      instruction_text: m.instruction_text || "",
      audio_url: m.audio_url || null,
      sort_order: m.sort_order || 0,
      questions: {
        data: (m.questions || []).map(q => ({
          question_text: q.question_text || "",
          options: q.options || [],
          correct_index: q.correct_index ?? 0,
          explanation: q.explanation || "",
          sort_order: q.sort_order || 0,
          is_mondai_header: q.is_mondai_header || false,
          audio_url: q.audio_url || null,
          image_url: q.image_url || null,
        })),
      },
    }));
    const { data, errors } = await nhostService.fetchGraphQL(mutation, "AddMondais", { objects });
    if (errors) {
      console.warn("[JLPT] addMondaisToExam error:", errors);
      return null;
    }
    return data?.insert_jlpt_practice_mondais || null;
  }

  async saveGeneratedExam(examData: Partial<JLPTExam>): Promise<{ id: string } | null> {
    const payload = {
      title: examData.title,
      level: examData.level,
      type: examData.type || "VOCAB",
      is_listening: examData.is_listening || false,
      source_deck_id: examData.source_deck_id,
      mondais: {
        data: (examData.mondais || []).map(m => ({
          mondai_number: m.mondai_number,
          title: m.title,
          instruction_text: m.instruction_text || "",
          audio_url: m.audio_url || null,
          sort_order: m.sort_order || 0,
          questions: {
            data: (m.questions || []).map(q => ({
              question_text: q.question_text || "",
              options: q.options || [],
              correct_index: q.correct_index ?? 0,
              explanation: q.explanation || "",
              sort_order: q.sort_order || 0,
              is_mondai_header: q.is_mondai_header || false,
              audio_url: q.audio_url || null,
              image_url: q.image_url || null,
            })),
          },
        })),
      },
    };

    return this.uploadExam(payload as any);
  }

  async deleteExam(examId: string): Promise<{ id: string } | null> {
    const mutation = `
      mutation DeleteExam($id: uuid!) {
        delete_jlpt_practice_exams_by_pk(id: $id) {
          id
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "DeleteExam", { id: examId });
    if (error) throw error;
    return data?.delete_jlpt_practice_exams_by_pk || null;
  }

  async deleteMondai(mondaiId: string): Promise<{ id: string } | null> {
    const mutation = `
      mutation DeleteMondai($id: uuid!) {
        delete_jlpt_practice_mondais_by_pk(id: $id) {
          id
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "DeleteMondai", { id: mondaiId });
    if (error) throw error;
    return data?.delete_jlpt_practice_mondais_by_pk || null;
  }

  async updateMondai(mondaiId: string, updates: Partial<JLPTMondai>): Promise<JLPTMondai | null> {
    const mutation = `
      mutation UpdateMondai($id: uuid!, $set: jlpt_practice_mondais_set_input!) {
        update_jlpt_practice_mondais_by_pk(pk_columns: {id: $id}, _set: $set) {
          id
          title
          instruction_text
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "UpdateMondai", {
      id: mondaiId,
      set: updates,
    });
    if (error) throw error;
    return data?.update_jlpt_practice_mondais_by_pk || null;
  }

  async updateQuestion(questionId: string, updates: Partial<JLPTQuestion>): Promise<JLPTQuestion | null> {
    const mutation = `
      mutation UpdateQuestion($id: uuid!, $set: jlpt_practice_questions_set_input!) {
        update_jlpt_practice_questions_by_pk(pk_columns: {id: $id}, _set: $set) {
          id
          question_text
          options
          correct_index
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, "UpdateQuestion", {
      id: questionId,
      set: updates,
    });
    if (error) throw error;
    return data?.update_jlpt_practice_questions_by_pk || null;
  }
}

export const examRepository = new NhostExamRepository();

