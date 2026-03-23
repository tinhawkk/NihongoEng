import React, { useState } from "react";
import { useParams } from "react-router-dom";

// Placeholder for Gemini/OpenAI API integration
async function checkSentenceWithAI(sentence, word) {
  // TODO: Call Gemini/OpenAI API here
  // Return { grammarOk: true/false, contextOk: true/false, suggestions: [], youglishLinks: [] }
  return {
    grammarOk: true,
    contextOk: true,
    suggestions: ["Câu này tự nhiên!"],
    youglishLinks: [
      `https://youglish.com/search/${encodeURIComponent(word)}/japanese`, // Example
    ],
  };
}

export const SentencePracticePage = () => {
  const { word } = useParams();
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    const res = await checkSentenceWithAI(sentence, word);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
        Đặt câu với từ: <span className="text-blue-500">{word}</span>
      </h1>
      <textarea
        className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-lg font-bold"
        rows={4}
        placeholder="Nhập câu tiếng Nhật của bạn..."
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        disabled={loading}
      />
      <button
        className="w-full py-3 rounded-2xl bg-[#1CB0F6] text-white font-black text-lg hover:bg-[#1899D6] transition-all"
        onClick={handleCheck}
        disabled={loading || !sentence.trim()}
      >
        {loading ? "Đang kiểm tra..." : "Kiểm tra với AI"}
      </button>
      {result && (
        <div className="mt-6 space-y-3 bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-100 dark:border-slate-700">
          <div className="font-bold text-green-600">Ngữ pháp: {result.grammarOk ? "✔️" : "❌"}</div>
          <div className="font-bold text-blue-600">Ngữ cảnh: {result.contextOk ? "✔️" : "❌"}</div>
          <div className="text-slate-700 dark:text-slate-200">
            <strong>Gợi ý:</strong>
            <ul className="list-disc ml-6">
              {result.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="text-slate-700 dark:text-slate-200">
            <strong>Ví dụ thực tế (Youglish):</strong>
            <ul className="list-disc ml-6">
              {result.youglishLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
