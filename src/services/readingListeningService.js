
import { nhostService } from "./nhostService";

export const readingListeningService = {
  /**
   * Fetch lessons by level
   */
  async fetchLessons(level) {
    const query = `
      query GetReadingLessons($level: String!) {
        reading_lessons(where: {level: {_eq: $level}}, order_by: {created_at: desc}) {
          id
          title
          content
          reading_points
          type
          audio_url
          image_url
          created_at
          sections(order_by: {order_index: asc}) {
            id
            title
            content
          }
        }
      }
    `;
    const { data } = await nhostService.fetchGraphQL(query, "GetReadingLessons", { level });
    return data?.reading_lessons || [];
  },

  /**
   * Fetch lesson detail with sections and questions
   */
  async fetchLessonDetail(id) {
    const query = `
      query GetLessonDetail($id: uuid!) {
        reading_lessons_by_pk(id: $id) {
          id
          title
          content
          reading_points
          type
          audio_url
          image_url
          sections(order_by: {order_index: asc}) {
            id
            title
            content
            questions(order_by: {order_index: asc}) {
              id
              question_text
              options
              correct_index
              explanation
            }
          }
          # Fallback for old simple lessons
          questions(where: {section_id: {_is_null: true}}, order_by: {order_index: asc}) {
            id
            question_text
            options
            correct_index
            explanation
          }
        }
      }
    `;
    const { data } = await nhostService.fetchGraphQL(query, "GetLessonDetail", { id });
    return data?.reading_lessons_by_pk;
  },

  /**
   * Import a complex lesson with multiple sections (Mondais)
   */
  async importLesson(lesson, sections) {
    const mutation = `
      mutation ImportComplexLesson($object: reading_lessons_insert_input!) {
        insert_reading_lessons_one(object: $object) {
          id
        }
      }
    `;

    // Process sections to match Hasura nested format
    const processedSections = sections.map((s, sIdx) => ({
      title: s.title,
      content: s.content,
      order_index: sIdx,
      questions: {
        data: s.questions.map((q, qIdx) => ({
          question_text: q.question_text,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          order_index: qIdx
        }))
      }
    }));

    const object = {
      ...lesson,
      sections: {
        data: processedSections
      }
    };

    const { data, errors } = await nhostService.fetchGraphQL(mutation, "ImportComplexLesson", { object });
    if (errors) throw new Error(errors[0].message);
    return data.insert_reading_lessons_one;
  }
};
