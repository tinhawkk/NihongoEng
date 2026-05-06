const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const geminiService = {
  async generateExplanation(prompt, media = { audioUrl: null, imageUrl: null }) {
    if (!GROQ_API_KEY) {
      throw new Error("Missing Groq API Key.");
    }

    const { audioUrl } = media || {};

    try {
      console.log(`[AI] 🚀 Requesting Groq Llama-3.3-70b (Wait for the speed!)...`);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Bạn là chuyên gia luyện thi JLPT. Hãy giải thích câu hỏi người dùng đưa ra một cách chi tiết bằng tiếng Việt, bao gồm bản dịch, phân tích ngữ pháp và mẹo nhớ.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`[AI] ✅ Groq Success!`);
        let aiText = data.choices?.[0]?.message?.content || "";
        
        if (audioUrl) {
          aiText += "\n\n📢 **Lưu ý:** Đây là câu hỏi nghe hiểu. Bạn hãy nghe kỹ lại file âm thanh, chúng tôi sẽ cập nhật script nội dung nghe sớm nhất!";
        }
        
        return aiText;
      }

      const errMsg = data.error?.message || response.statusText;
      console.error(`[Groq] Error:`, errMsg);
      throw new Error(errMsg);

    } catch (err) {
      console.error(`[AI] Groq Request failed:`, err.message);
      throw new Error(`AI Error (Groq): ${err.message}`);
    }
  },
};
