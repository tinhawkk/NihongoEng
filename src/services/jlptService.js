import { nhostService } from './nhostService';

export const jlptService = {
  async getExamsByLevel() {
    const query = `
      query GetJLPTExams {
        jlpt_practice_exams(
          where: {mondais: {id: {_is_null: false}}},
          order_by: {level: asc, title: asc}
        ) {
          id
          title
          level
          url
          Type
          is_listening
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(query, 'GetJLPTExams');
    if (error) throw error;
    
    // Group by level
    const grouped = (data?.jlpt_practice_exams || []).reduce((acc, exam) => {
      const level = exam.level || 'Unknown';
      if (!acc[level]) acc[level] = [];
      acc[level].push(exam);
      return acc;
    }, {});
    
    return grouped;
  },

  async getExamWithQuestions(examId) {
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
    const { data, error } = await nhostService.fetchGraphQL(query, 'GetExamWithQuestions', { id: examId });
    if (error) throw error;
    return data?.jlpt_practice_exams_by_pk;
  },

  async updateQuestionExplanation(questionId, explanation) {
    const mutation = `
      mutation UpdateExplanation($id: uuid!, $explanation: String!) {
        update_jlpt_practice_questions_by_pk(pk_columns: {id: $id}, _set: {explanation: $explanation}) {
          id
          explanation
        }
      }
    `;
    const { data, error } = await nhostService.fetchGraphQL(mutation, 'UpdateExplanation', { id: questionId, explanation });
    if (error) throw error;
    return data?.update_jlpt_practice_questions_by_pk;
  }
};
