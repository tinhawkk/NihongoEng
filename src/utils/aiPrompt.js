/**
 * Generates a high-quality prompt for explaining JLPT questions.
 * @param {string} question - The raw question text (may contain <u> tags)
 * @param {Array} options - List of options strings
 * @param {number} correctIdx - Index of the correct option
 * @param {string} level - JLPT Level (N1-N5)
 * @returns {string} The formatted prompt
 */
export const getJLPTExplainPrompt = (question, options, correctIdx, level = 'N5') => {
  const cleanQuestion = question.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags
  const correctAnswer = options[correctIdx];

  return `
Bạn là một giáo viên tiếng Nhật trình độ cao, chuyên luyện thi JLPT. 
Hãy giải thích câu hỏi JLPT trình độ ${level} sau đây cho học viên người Việt Nam:

---
Câu hỏi: "${cleanQuestion}"
Các lựa chọn:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Đáp án đúng là: ${correctAnswer}
---

Nhiệm vụ của bạn:
1. **Phân tích ngữ cảnh**: Giải thích ngắn gọn câu này đang nói về điều gì.
2. **Từ vựng & Ngữ pháp**: Giải thích ý nghĩa và cách dùng của các từ khóa trong câu (đặc biệt là phần được gạch chân trong câu gốc nếu có).
3. **Tại sao chọn đáp án này**: Giải thích logic tại sao "${correctAnswer}" là phương án đúng duy nhất.
4. **Mẹo ghi nhớ**: Cung cấp một mẹo nhỏ hoặc ví dụ tương tự để học viên nhớ lâu hơn.
5. **Dịch câu**: Dịch toàn bộ câu hỏi và đáp án sang tiếng Việt một cách tự nhiên nhất.

Yêu cầu trình bày:
- Ngôn ngữ: Tiếng Việt.
- Giọng văn: Thân thiện, sư phạm, chuyên nghiệp.
- Định dạng: Sử dụng Markdown (in đậm, danh sách) để làm nổi bật các ý quan trọng. Không lặp lại phần câu hỏi gốc quá nhiều.
  `.trim();
};
