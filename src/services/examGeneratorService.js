/**
 * Exam Generator Service — v3.5 (JLPT Real Exam Optimized)
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const AI_MODEL = import.meta.env.VITE_EXAM_AI_MODEL || "llama-3.3-70b-versatile";

const DELAY_BETWEEN_CALLS_MS = 35000;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGroq(prompt, level, maxTokens = 4096, retryCount = 0) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: /A1|A2|B1|B2|C1|C2|IELTS|TOEIC|ENG/i.test(level) ? `
Bạn là chuyên gia giảng dạy và kiểm tra kỳ thi Tiếng Anh (IELTS, TOEIC, CEFR) chuyên nghiệp tuyến đầu.

Mục tiêu:
- Tự động thay thế/chuyển đổi nội dung tạo đề thi thành bài kiểm tra Tiếng Anh (English test) tương đương format yêu cầu (Đồng nghĩa, Từ vựng, Ngữ pháp, Đọc hiểu).
- Cung cấp đề giống đề IELTS/CEFR thật.

Quy tắc:
1. Trả về đúng định dạng JSON yêu cầu. TUYỆT ĐỐI KHÔNG dùng ký tự xuống dòng (Enter) hoặc Tab thực tế bên trong chuỗi JSON. Dùng kí tự escape (ví dụ: \\n, \\t).
2. Mỗi câu hỏi đi kèm 4 đáp án (1 đúng, 3 sai nhưng đánh lừa hợp lý). Đáp án sai phải cùng loại từ, dễ nhầm.
3. TOÀN BỘ ĐỀ THI (Đoạn văn, Câu hỏi, Đáp án) PHẢI VIẾT BẰNG TIẾNG ANH 100%. Tựa đề bài và instruction_text cũng là Tiếng Anh. TUYỆT ĐỐI KHÔNG DÙNG TIẾNG NHẬT HOẶC TIẾNG VIỆT TRONG DATA TRẢ VỀ.
4. Ưu tiên bám sát danh sách từ vựng Tiếng Anh được cung cấp.

Level ${level}:
- Dùng từ vựng và ngữ pháp Tiếng Anh nâng cao tương đương trình độ ${level}.
- Phân bổ độ khó: 30% dễ, 50% trung bình, 20% khó.
` : `
Bạn là người ra đề JLPT chuyên nghiệp.

Mục tiêu:
- Tạo đề giống JLPT thật, có tính phân loại năng lực.
- Không tạo câu hỏi dễ đoán.

Quy tắc:
1. Trả về đúng định dạng JSON yêu cầu. TUYỆT ĐỐI KHÔNG dùng ký tự xuống dòng (Enter) hoặc Tab thực tế bên trong giá trị chuỗi (string) của JSON. Hãy dùng kí tự escape (ví dụ: \\n, \\t).
2. Mỗi câu có 1 đáp án đúng, 3 đáp án sai nhưng hợp lý.
3. Đáp án sai phải cùng loại từ, gần nghĩa hoặc dễ nhầm.
4. TOÀN BỘ NỘI DUNG ĐỀ THI (Đoạn văn, Câu hỏi, Đáp án) PHẢI VIẾT BẰNG TIẾNG NHẬT. TUYỆT ĐỐI KHÔNG DÙNG TIẾNG VIỆT TRONG ĐỀ THI.
5. Không lặp cấu trúc câu.

Level ${level}:
- Chỉ dùng từ vựng & ngữ pháp phù hợp JLPT ${level}.
- Phân bổ độ khó:
  30% dễ, 50% trung bình, 20% khó.
          `,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    let errMsg = "Groq API error";
    try {
      const data = await response.json();
      errMsg = data.error?.message || errMsg;
    } catch (e) {}

    if (response.status === 429 && retryCount < 2) {
      console.warn(`[ExamGen] Rate limited (429). Retrying in 30s... (Attempt ${retryCount + 1}/2)`);
      await delay(30000);
      return callGroq(prompt, level, maxTokens, retryCount + 1);
    }
    throw new Error(errMsg);
  }

  const data = await response.json();

  let text = data.choices?.[0]?.message?.content || "";
    function extractJSON(str) {
      const firstOpen = str.indexOf('[');
      const lastClose = str.lastIndexOf(']');
      if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        return str.substring(firstOpen, lastClose + 1);
      }
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return str.substring(firstBrace, lastBrace + 1);
      }
      return str;
    }

    let jsonStr = extractJSON(text);

    try {
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn("[ExamGen] JSON Parse failed, attempting to sanitize and close truncated JSON...");
      let inString = false;
      let isEscaped = false;
      let newStr = '';
      const stack = [];

      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (inString) {
          if (char === '"' && !isEscaped) inString = false;
          else if (char === '\\' && !isEscaped) isEscaped = true;
          else isEscaped = false;

          if (char === '\n') newStr += '\\n';
          else if (char === '\r') newStr += '\\r';
          else if (char === '\t') newStr += '\\t';
          else if (char.charCodeAt(0) < 32) {} // drop other control chars
          else newStr += char;
        } else {
          if (char === '"') inString = true;
          else if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
          else if (char === '}' || char === ']') stack.pop();
          newStr += char;
        }
      }

      // Close unclosed structures
      if (inString) newStr += '"';
      while (stack.length > 0) {
        newStr += stack.pop();
      }

      try {
        return JSON.parse(newStr);
      } catch (finalErr) {
        // One last attempt: if it's an array, try to find the last complete object
        if (newStr.trim().startsWith('[')) {
          const lastObjEnd = newStr.lastIndexOf('}');
          if (lastObjEnd !== -1) {
            try { return JSON.parse(newStr.substring(0, lastObjEnd + 1) + ']'); } catch(e) {}
          }
        }
        throw finalErr;
      }
    }
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function formatWordList(words) {
  if (!words || words.length === 0) return "";
  return words.map((w, i) => `${i + 1}. ${w.word}${w.reading ? "(" + w.reading + ")" : ""} = ${w.meaning}`).join("\\n");
}

const PASSAGE_JSON = `
Trả về JSON object chính xác theo cấu trúc sau:
{
  "title": "Tựa đề đoạn văn (bằng tiếng Nhật)",
  "passage": "Nội dung đoạn văn...",
  "questions": [
    {
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_index": 0
    },
    {
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_index": 1
    },
    {
      "question_text": "...",
      "options": ["...", "...", "...", "..."],
      "correct_index": 2
    }
  ]
}
`;

// ================= PROMPTS =================

// Mondai 1
const buildM1 = (w, lvl, count = 6) => `
Tạo ${count} câu Mondai 1 (漢字読み方 - Cách đọc Kanji) JLPT ${lvl}.

Yêu cầu:
1. Viết các câu tiếng Nhật hoàn chỉnh, tự nhiên.
2. Trong mỗi câu, chọn 1 từ vựng (chứa Kanji) và IN ĐẬM bằng Markdown, ví dụ: **漢字**. TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [ ].
3. Trường \`question_text\` CHỈ LÀ câu tiếng Nhật, KHÔNG BAO GỒM CÂU HỎI PHỤ (như "cách đọc là gì?").
4. Đáp án sai phải là các cách đọc dễ nhầm lẫn (trường âm, âm ngắt, biến âm).

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "私の住所は**東京**です。",
    "options": ["とうきょう", "とっきょう", "とうきょ", "とっきょ"],
    "correct_index": 0
  }
]

${w.length > 0 ? `Dùng các từ vựng sau để ra đề:\n${formatWordList(w)}` : `Hãy tự chọn các từ vựng JLPT ${lvl} ngẫu nhiên để ra đề.`}
`;

// Mondai 2
const buildM2 = (w, lvl, count = 6) => `
Tạo ${count} câu Mondai 2 (漢字表記 - Cách viết Kanji) JLPT ${lvl}.

Yêu cầu:
1. Viết các câu tiếng Nhật hoàn chỉnh, tự nhiên.
2. Trong mỗi câu, chọn 1 từ vựng (viết bằng Hiragana) và IN ĐẬM bằng Markdown, ví dụ: **ひらがな**. TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [ ].
3. Trường \`question_text\` CHỈ LÀ câu tiếng Nhật, KHÔNG BAO GỒM CÂU HỎI PHỤ (như "cách viết là gì?").
4. Đáp án sai phải là các chữ Kanji có bộ thủ giống hoặc phát âm giống, dễ gây nhầm lẫn.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "朝、早く**おきて**勉強します。",
    "options": ["起きて", "就きて", "超きて", "赴きて"],
    "correct_index": 0
  }
]

${w.length > 0 ? `Dùng các từ vựng sau để ra đề:\n${formatWordList(w)}` : `Hãy tự chọn các từ vựng JLPT ${lvl} ngẫu nhiên để ra đề.`}
`;

// Mondai 3
const buildM3 = (w, lvl, count = 7) => `
Tạo ${count} câu Mondai 3 (文脈規定 - Điền từ theo ngữ cảnh) JLPT ${lvl}.

Yêu cầu:
1. Viết các câu tiếng Nhật hoàn chỉnh, để trống 1 vị trí đánh dấu bằng （　　）.
2. Trường \`question_text\` CHỈ LÀ câu tiếng Nhật chứa chỗ trống, KHÔNG BAO GỒM CÂU HỎI PHỤ.
3. 4 đáp án phải cùng loại từ (cùng là danh từ, động từ, v.v.).
4. Các đáp án sai phải có nghĩa gần giống hoặc hay dùng trong các ngữ cảnh tương tự.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "夏には、冷たい（　　）が飲みたい。",
    "options": ["氷", "水", "お茶", "ジュース"],
    "correct_index": 1
  }
]

${w.length > 0 ? `Dùng các từ vựng sau để ra đề:\n${formatWordList(w)}` : `Hãy tự chọn các từ vựng JLPT ${lvl} ngẫu nhiên để ra đề.`}
`;

// Mondai 4
const buildM4 = (w, lvl, count = 6) => `
Tạo ${count} câu Mondai 4 (言い換え類義語 - Từ đồng nghĩa) JLPT ${lvl}.

Yêu cầu:
1. Viết các câu hoàn chỉnh, IN ĐẬM bằng Markdown **một từ/cụm từ** cần hỏi. TUYỆT ĐỐI KHÔNG dùng dấu ngoặc vuông [ ].
2. Trường \`question_text\` CHỈ LÀ câu tiếng Nhật, KHÔNG BAO GỒM CÂU HỎI PHỤ.
3. Đáp án sai phải có liên quan nhưng không thể thay thế trong ngữ cảnh của câu.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "彼は**しょっちゅう**遅刻する。",
    "options": ["たまに", "いつも", "ぜんぜん", "よく"],
    "correct_index": 3
  }
]

${w.length > 0 ? `Dùng các từ vựng sau để ra đề:\n${formatWordList(w)}` : `Hãy tự chọn các từ vựng JLPT ${lvl} ngẫu nhiên để ra đề.`}
`;

// Mondai 5
const buildM5 = (w, lvl, count = 5) => `
Tạo ${count} câu Mondai 5 (用法 - Cách sử dụng từ) JLPT ${lvl}.

Yêu cầu:
1. Cung cấp 1 từ khóa làm \`question_text\`. CHỈ GHI TỪ KHÓA, KHÔNG GHI GÌ THÊM.
2. 4 đáp án (options) là 4 CÂU HOÀN CHỈNH sử dụng từ khóa đó.
3. Chỉ có 1 câu sử dụng đúng ngữ cảnh, sắc thái và ngữ pháp.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "うっかり",
    "options": ["うっかりして、傘を電車に忘れてしまった。", "彼はうっかりな性格だ。", "明日はうっかり晴れるだろう。", "うっかりと勉強した。"],
    "correct_index": 0
  }
]

${w.length > 0 ? `Dùng các từ vựng sau làm từ khóa:\n${formatWordList(w)}` : `Hãy tự chọn các từ vựng JLPT ${lvl} ngẫu nhiên làm từ khóa.`}
`;

// Mondai 6
const buildM6 = (_, lvl) => `
Tạo 5 câu Mondai 6 (文法形式 - Ngữ pháp) JLPT ${lvl}.

Yêu cầu:
1. Viết các câu tiếng Nhật có chỗ trống （　　）. TUYỆT ĐỐI chỉ sử dụng các mẫu ngữ pháp đặc trưng của trình độ JLPT ${lvl}.
2. Trường \`question_text\` CHỈ LÀ câu tiếng Nhật chứa chỗ trống, KHÔNG BAO GỒM CÂU HỎI PHỤ.
3. 4 đáp án là các mẫu ngữ pháp thuộc JLPT ${lvl}. Các đáp án sai cũng phải là ngữ pháp thật, dễ gây nhầm lẫn.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "雨が降って（　　）、試合は行われます。",
    "options": ["いても", "いると", "いれば", "いるなら"],
    "correct_index": 0
  }
]
`;

// Mondai 7
const buildM7 = (_, lvl) => `
Tạo 3 câu Mondai 7 (文の組み立て - Sắp xếp câu) JLPT ${lvl}.

Yêu cầu:
1. \`question_text\` là một câu chưa hoàn chỉnh, có 4 chỗ trống và 1 dấu sao, ví dụ: "私は ___ ___ ★ ___ と思います。"
2. BẮT BUỘC câu hỏi phải kiểm tra cách ghép nối các cấu trúc ngữ pháp đặc trưng thuộc trình độ JLPT ${lvl}.
3. 4 đáp án (options) là 4 cụm từ để điền vào 4 vị trí trên.
4. \`correct_index\` là vị trí (0, 1, 2, 3) của cụm từ rơi vào dấu ★.

Trả về mảng JSON (JSON array) theo cấu trúc ví dụ sau:
[
  {
    "question_text": "私は ___ ___ ★ ___ と思います。",
    "options": ["とても", "面白い", "この映画は", "です"],
    "correct_index": 1
  }
]
`;

// Mondai 8
const buildM8 = (_, lvl) => `
Tạo Mondai 8 (文章の文法 - Ngữ pháp trong đoạn văn) JLPT ${lvl}.

Yêu cầu:
1. Viết 1 đoạn văn (200-300 chữ) tự nhiên, logic.
2. ĐẶT TỰA ĐỀ cho đoạn văn (Ngắn gọn, phản ánh đúng nội dung).
3. TẠO CHÍNH XÁC 3 CHỖ TRỐNG trong đoạn văn, ký hiệu lần lượt là （１）, （２）, （３）.
4. Tạo ĐÚNG 3 CÂU HỎI trắc nghiệm tương ứng cho 3 chỗ trống này (điền liên từ, mẫu câu, đại từ chỉ thị...).
5. TOÀN BỘ BẰNG TIẾNG NHẬT. KHÔNG DÙNG TIẾNG VIỆT.

${PASSAGE_JSON}
`;

// Mondai 9
const buildM9 = (_, lvl) => `
Tạo Mondai 9 (短文理解 - Đọc hiểu đoạn văn ngắn) JLPT ${lvl}.

Yêu cầu:
1. Viết 1 đoạn văn ngắn (200-250 chữ) về email, thông báo, hoặc ý kiến.
2. ĐẶT TỰA ĐỀ cho đoạn văn.
3. Tạo ĐÚNG 3 CÂU HỎI đọc hiểu sâu sắc (hỏi lý do, ý chính).
4. Câu hỏi và các đáp án sai phải yêu cầu khả năng suy luận, không chỉ copy y nguyên từ bài đọc.
5. TOÀN BỘ BẰNG TIẾNG NHẬT. KHÔNG DÙNG TIẾNG VIỆT.

${PASSAGE_JSON}
`;

// Mondai 10
const buildM10 = (_, lvl) => `
Tạo Mondai 10 (中文理解 - Đọc hiểu đoạn văn trung bình) JLPT ${lvl}.

Yêu cầu:
1. Viết 1 bài đọc (400-500 chữ) trình bày quan điểm, so sánh hoặc giải thích vấn đề.
2. ĐẶT TỰA ĐỀ cho đoạn văn.
3. Tạo ĐÚNG 3 CÂU HỎI đọc hiểu (hỏi chi tiết, từ thay thế "sore" chỉ gì, ý kiến tác giả).
4. TOÀN BỘ BẰNG TIẾNG NHẬT. KHÔNG DÙNG TIẾNG VIỆT.

${PASSAGE_JSON}
`;

// Mondai 11
const buildM11 = (_, lvl) => `
Tạo Mondai 11 (長文理解 - Đọc hiểu đoạn văn dài) JLPT ${lvl}.

Yêu cầu:
1. Viết 1 bài đọc dài (700-800 chữ) có cấu trúc lập luận chặt chẽ (mở - thân - kết).
2. ĐẶT TỰA ĐỀ cho đoạn văn.
3. Tạo ĐÚNG 3 CÂU HỎI đòi hỏi khả năng tổng hợp thông tin, hiểu ngụ ý và tóm tắt ý chính của tác giả.
4. TOÀN BỘ BẰNG TIẾNG NHẬT. KHÔNG DÙNG TIẾNG VIỆT.

${PASSAGE_JSON}
`;

// Mondai 12
const buildM12 = (_, lvl) => `
Tạo Mondai 12 (情報検索 - Tìm kiếm thông tin) JLPT ${lvl}.

Yêu cầu:
1. Mô phỏng tờ rơi, lịch trình, bảng quy định (có số liệu, thời gian, điều kiện).
2. ĐẶT TỰA ĐỀ cho trang thông tin này.
3. BẮT BUỘC sử dụng định dạng Markdown (ví dụ: tạo bảng Markdown \`|...|...\`, gạch đầu dòng \`-\`, in đậm \`**...\**\`) cho phần nội dung đoạn văn (\`passage\`) để hiển thị trực quan và giống thật nhất.
4. Tạo ĐÚNG 3 CÂU HỎI tìm kiếm thông tin ứng dụng (ví dụ: "Anh A có điều kiện X thì phải chọn gói nào/tốn bao nhiêu tiền?").
5. Các đáp án sai phải là những cạm bẫy dễ mắc phải nếu không đọc kỹ điều kiện phụ.
6. TOÀN BỘ BẰNG TIẾNG NHẬT. KHÔNG DÙNG TIẾNG VIỆT.

${PASSAGE_JSON}
`;

// ================= ENGLISH PROMPTS =================
const buildEngVocab = (w, type = "synonym") => `
Generate ${w.length || 5} English ${type} questions in a JSON array.
Format:
[
  {
    "question_text": "He decided to **abandon** his car.",
    "options": ["leave behind", "repair", "sell", "paint"],
    "correct_index": 0
  }
]
Requirements:
1. Write natural English sentences.
2. In each sentence, choose one word to test and bold it using Markdown **word**.
3. Incorrect options must be plausible but wrong in context.
4. Output ONLY valid JSON array.
${w.length > 0 ? `Use these words as the target test words:\n${formatWordList(w)}` : ''}
`;

const buildEngGrammar = (w, count = 6) => `
Generate ${count} English grammar fill-in-the-blank questions in a JSON array.
Format:
[
  {
    "question_text": "She has been living here (____) 2010.",
    "options": ["since", "for", "in", "from"],
    "correct_index": 0
  }
]
Requirements:
1. The sentence must have a blank indicated by (____).
2. Options must test tenses, prepositions, gerunds, or complex grammar structures appropriate for the level.
3. Output ONLY valid JSON array.
${w.length > 0 ? `(Optional) Try incorporating these words functionally if possible:\n${formatWordList(w)}` : ''}
`;

const buildEngPassage = (type = "Short Reading") => `
Generate an English reading comprehension test in JSON format.
You MUST output EXACTLY ONE JSON object with "title", "passage", and "questions" properties.
Format:
{
  "title": "Passage Title",
  "passage": "Passage content here... (approx 200-500 words depending on type: ${type})",
  "questions": [
    {
      "question_text": "What is the main idea of the passage?",
      "options": ["...", "...", "...", "..."],
      "correct_index": 0
    }
  ]
}
Requirements:
1. Provide exactly 3 high-quality questions for the passage within the "questions" array.
2. Questions should test main ideas, specific details, inferences, and vocabulary in context.
3. Output ONLY the raw JSON object. Do not use Markdown formatting for the JSON. Do not write \`\`\`json.
`;

// ================= MAIN =================

export const examGeneratorService = {
  async generateExam(words, meta, onProgress) {
    const level = meta.level?.toUpperCase() || "N3";
    const mondais = [];
    const allWords = shuffleArray(words);

    const run = async (num, title, inst, builder, isPassage = false) => {
      try {
        if (num > 1) await delay(DELAY_BETWEEN_CALLS_MS);
        onProgress?.(num, 12);
        const raw = await callGroq(builder(allWords, level), level, isPassage ? 5000 : 4096);
        
        if (isPassage) {
          const d = Array.isArray(raw) ? raw[0] : (raw || {});
          // Combine title and passage
          const combinedText = d.title ? `### ${d.title}\n\n${d.passage || ""}` : (d.passage || "");
          const qs = Array.isArray(d.questions) ? d.questions : [];
          mondais.push({
            mondai_number: num, title, instruction_text: inst, sort_order: num,
            questions: [{ question_text: combinedText, is_mondai_header: true }, ...qs]
          });
        } else {
          const qs = Array.isArray(raw) ? raw : (raw?.questions && Array.isArray(raw.questions) ? raw.questions : []);
          if (qs.length > 0) {
            mondais.push({ mondai_number: num, title, instruction_text: inst, sort_order: num, questions: qs });
          }
        }
      } catch (err) {
        console.warn(`[ExamGen] Failed to generate part ${num}: ${err.message}`);
      }
    };

    const isEng = /A1|A2|B1|B2|C1|C2|IELTS|TOEIC|ENG/i.test(level);

    await run(1, isEng ? "Part 1" : "問題1", isEng ? "Choose the synonym or meaning that best matches the given word." : "＿＿＿の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngVocab(w.slice(0, 6), "synonym") : buildM1(w.slice(0, 6), lvl, 6));
    await run(2, isEng ? "Part 2" : "問題2", isEng ? "Choose the correct spelling or word usage for the blank." : "＿＿＿の言葉を漢字で書くとき、最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngVocab(w.slice(6, 12), "definition") : buildM2(w.slice(6, 12), lvl, 6));
    await run(3, isEng ? "Part 3" : "問題3", isEng ? "Choose the word that best completes the sentence." : "（　　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngGrammar(w.slice(12, 19), 7) : buildM3(w.slice(12, 19), lvl, 7));
    await run(4, isEng ? "Part 4" : "問題4", isEng ? "Choose the option closest in meaning to the highlighted word." : "＿＿＿の言葉に意味が最も近いものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngVocab(w.slice(19, 25), "closest meaning") : buildM4(w.slice(19, 25), lvl, 6));
    await run(5, isEng ? "Part 5" : "問題5", isEng ? "Choose the sentence where the highlighted word is used correctly." : "次の言葉の使い方として最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngVocab(w.slice(25, 30), "correct usage") : buildM5(w.slice(25, 30), lvl, 5));
    await run(6, isEng ? "Part 6" : "問題6", isEng ? "Choose the best grammar or word option for the blank." : "次の文の（　　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngGrammar([], 5) : buildM6(w, lvl));
    await run(7, isEng ? "Part 7" : "問題7", isEng ? "Arrange the words in the correct order to form a sentence." : "次の文の＿★＿に入る最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngGrammar([], 3) : buildM7(w, lvl));
    await run(8, isEng ? "Part 8" : "問題8", isEng ? "Read the passage and choose the best word to fill in the blank." : "次の文章を読んで、文章全体の趣旨を踏まえて、（　　）の中に入る最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngPassage("Reading Fill Blank") : buildM8(w, lvl), true);
    await run(9, isEng ? "Part 9" : "問題9", isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngPassage("Short Reading Comprehension") : buildM9(w, lvl), true);
    await run(10, isEng ? "Part 10" : "問題10", isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngPassage("Medium Reading Comprehension") : buildM10(w, lvl), true);
    await run(11, isEng ? "Part 11" : "問題11", isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngPassage("Long Reading Comprehension") : buildM11(w, lvl), true);
    await run(12, isEng ? "Part 12" : "問題12", isEng ? "Read the information page and answer the questions based on it." : "次のページを見て、下の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", (w, lvl) => isEng ? buildEngPassage("Information Retrieval/Practical Reading") : buildM12(w, lvl), true);

    return { 
      title: isEng ? `MOCK TEST ${level.toUpperCase()} - ${meta.deckTitle}` : `Đề thi JLPT ${level} Đề từ vựng - ${meta.deckTitle}`, 
      level, 
      source_deck_id: meta.deckId,
      mondais 
    };
  },

  async generateMissingMondais(existingNums, words, meta, onProgress) {
    const level = meta.level?.toUpperCase() || "N3";
    const ALL = [1,2,3,4,5,6,7,8,9,10,11,12];
    const missing = ALL.filter(n => !existingNums.includes(n));
    const newMondais = [];
    const allWords = shuffleArray(words);

    const isEng = /A1|A2|B1|B2|C1|C2|IELTS|TOEIC|ENG/i.test(level);
    const MONDAI_MAP = {
      1: { title: isEng ? "Part 1" : "問題1", inst: isEng ? "Choose the synonym or meaning that best matches the given word." : "＿＿＿の言葉の読み方として最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngVocab(w.slice(0, 6), "synonym") : buildM1(w.slice(0, 6), lvl, 6) },
      2: { title: isEng ? "Part 2" : "問題2", inst: isEng ? "Choose the correct spelling or word usage for the blank." : "＿＿＿の言葉を漢字で書くとき、最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngVocab(w.slice(6, 12), "definition") : buildM2(w.slice(6, 12), lvl, 6) },
      3: { title: isEng ? "Part 3" : "問題3", inst: isEng ? "Choose the word that best completes the sentence." : "（　　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngGrammar(w.slice(12, 19), 7) : buildM3(w.slice(12, 19), lvl, 7) },
      4: { title: isEng ? "Part 4" : "問題4", inst: isEng ? "Choose the option closest in meaning to the highlighted word." : "＿＿＿の言葉に意味が最も近いものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngVocab(w.slice(19, 25), "closest meaning") : buildM4(w.slice(19, 25), lvl, 6) },
      5: { title: isEng ? "Part 5" : "問題5", inst: isEng ? "Choose the sentence where the highlighted word is used correctly." : "次の言葉の使い方として最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngVocab(w.slice(25, 30), "correct usage") : buildM5(w.slice(25, 30), lvl, 5) },
      6: { title: isEng ? "Part 6" : "問題6", inst: isEng ? "Choose the best grammar or word option for the blank." : "次の文の（　　）に入れるのに最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngGrammar([], 5) : buildM6(w, lvl) },
      7: { title: isEng ? "Part 7" : "問題7", inst: isEng ? "Arrange the words in the correct order to form a sentence." : "次の文の＿★＿に入る最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngGrammar([], 3) : buildM7(w, lvl) },
      8: { title: isEng ? "Part 8" : "問題8", inst: isEng ? "Read the passage and choose the best word to fill in the blank." : "次の文章を読んで、文章全体の趣旨を踏まえて、（　　）の中に入る最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngPassage("Reading Fill Blank") : buildM8(w, lvl), p: true },
      9: { title: isEng ? "Part 9" : "問題9", inst: isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngPassage("Short Reading Comprehension") : buildM9(w, lvl), p: true },
      10: { title: isEng ? "Part 10" : "問題10", inst: isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngPassage("Medium Reading Comprehension") : buildM10(w, lvl), p: true },
      11: { title: isEng ? "Part 11" : "問題11", inst: isEng ? "Read the text and answer the questions below." : "次の文章を読んで、後の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngPassage("Long Reading Comprehension") : buildM11(w, lvl), p: true },
      12: { title: isEng ? "Part 12" : "問題12", inst: isEng ? "Read the information page and answer the questions based on it." : "次のページを見て、下の問いに対する答えとして最もよいものを、１・２・３・４から一つ選びなさい。", builder: (w, lvl) => isEng ? buildEngPassage("Information Retrieval/Practical Reading") : buildM12(w, lvl), p: true },
    };

    let step = 0;
    for (const num of missing) {
      try {
        if (step > 0) await delay(DELAY_BETWEEN_CALLS_MS);
        step++;
        onProgress?.(step, missing.length);
        const cfg = MONDAI_MAP[num];
        const raw = await callGroq(cfg.builder(allWords, level), level, cfg.p ? 5000 : 4096);
        
        if (cfg.p) {
          const d = Array.isArray(raw) ? raw[0] : (raw || {});
          // Combine title and passage
          const combinedText = d.title ? `### ${d.title}\n\n${d.passage || ""}` : (d.passage || "");
          const qs = Array.isArray(d.questions) ? d.questions : [];
          newMondais.push({
            mondai_number: num, title: cfg.title, instruction_text: cfg.inst, sort_order: num,
            questions: [{ question_text: combinedText, is_mondai_header: true }, ...qs]
          });
        } else {
          const qs = Array.isArray(raw) ? raw : (raw?.questions && Array.isArray(raw.questions) ? raw.questions : []);
          if (qs.length > 0) {
            newMondais.push({ mondai_number: num, title: cfg.title, instruction_text: cfg.inst, sort_order: num, questions: qs });
          }
        }
      } catch (err) {
        console.warn(`[ExamGen] Failed to generate missing part ${num}: ${err.message}`);
      }
    }
    return newMondais;
  },

  async generateMnemonics(words, level) {
    if (!words || words.length === 0) return [];
    const prompt = `
Bạn là một chuyên gia về Kanji và phương pháp ghi nhớ Mnemonic (Mnemonic Method). 
Mục tiêu của bạn là giúp người học "chinh phục chữ Hán" bằng cách biến các nét vẽ khô khan thành những câu chuyện sống động.

YÊU CẦU CHI TIẾT:
1. NẾU LÀ KANJI:
   - Áp dụng triệt để việc PHÂN TÍCH CẤU TẠO CHỮ: Tách chữ Kanji thành các thành phần nhỏ hơn (bộ thủ hoặc các chữ đơn giản đã biết).
   - GÁN NGHĨA & HÌNH ẢNH: Mỗi thành phần nhỏ phải được gán với một hình ảnh hoặc ý nghĩa cụ thể.
   - GHÉP THÀNH CÂU CHUYỆN: Kết nối các hình ảnh đó thành một câu chuyện ngắn gọn (1-2 câu), gần gũi, logic để ghi nhớ nghĩa của từ.
   - Ví dụ: Chữ 幼 (ẤU) gồm bộ YÊU (幺 - nhỏ bé) và bộ LỰC (力 - sức mạnh) -> Đứa trẻ nhỏ bé (幺) dùng hết sức lực (力) để chơi với bạn THUỞ BÉ.
   - Ví dụ: Chữ 働 (ĐỘNG) gồm Nhân (亻), Trọng (重), Lực (力) -> Con NGƯỜI (亻) dùng SỨC LỰC (力) làm việc NẶNG (重) là LAO ĐỘNG.

2. NẾU LÀ KANA (Không có Kanji):
   - Thì bạn bỏ qua không cần trả output.

3. NGUYÊN TẮC:
   - Dùng kiến thức đã biết để kết nối với điều chưa biết.
   - Câu chuyện phải gần gũi, dễ tưởng tượng, không chế âm thanh lố bịch hoặc gượng ép.
   - Ngôn ngữ: Tiếng Việt tự nhiên, súc tích (1-2 câu).
   - QUY TẮC JSON: Trả về JSON Array thuần túy. KHÔNG ĐƯỢC có văn bản nào bên ngoài cặp ngoặc []. Trong nội dung mnemonic, TUYỆT ĐỐI KHÔNG dùng dấu ngoặc kép (") bên trong chuỗi, hãy dùng dấu nháy đơn (') nếu cần.

Danh sách từ vựng cần tạo mẹo nhớ:
${words.map(w => `- ${w.word} (${w.reading || w.furigana || w.hanViet || ''}): ${w.meaning || w.meaning_vi}`).join('\n')}

Trả về MẢNG JSON chính xác theo định dạng:
[
  { 
    "word": "...", 
    "mnemonic": "..." 
  }
]
`;
    try {
      const raw = await callGroq(prompt, level || "N3", 4000);
      return Array.isArray(raw) ? raw : [];
    } catch (err) {
      console.error("[ExamGen] Error generating mnemonics:", err);
      return [];
    }
  }
};