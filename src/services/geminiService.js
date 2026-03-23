const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const geminiService = {
  async generateExplanation(prompt, audioUrl = null) {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing Gemini API Key in .env");
    }

    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    let lastError = null;

    for (const model of models) {
      try {
        const parts = [{ text: prompt }];

        if (audioUrl && audioUrl.startsWith('http')) {
          try {
            const res = await fetch(audioUrl);
            if (res.ok) {
              const blob = await res.blob();
              const arrayBuffer = await blob.arrayBuffer();
              const baseBase64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
              parts.push({
                inline_data: {
                  mime_type: blob.type || "audio/mp3",
                  data: baseBase64
                }
              });
            }
          } catch (e) {
            console.warn(`[Gemini] Failed to attach audio for model ${model}:`, e.message);
          }
        }

        // Try both v1beta and v1 if needed, but let's start with v1beta for better multimodal support
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          }),
        });

        const data = await response.json();
        if (response.ok) {
          return data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        // If quota exceeded or model not found, try next model
        console.warn(`[Gemini] Model ${model} failed, trying fallback:`, data.error?.message);
        lastError = data.error?.message || response.statusText;
        
        // If it's a rate limit (429), maybe wait a bit? But here we just try fallback
      } catch (error) {
        console.error(`[Gemini] Exception for model ${model}:`, error);
        lastError = error.message;
      }
    }

    throw new Error(`AI Error: ${lastError}`);
  }
};
