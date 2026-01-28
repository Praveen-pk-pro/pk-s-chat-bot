
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const SSEC_IDENTITY = `
SSEC AI IDENTITY:
- Institution: Sree Sakthi Engineering College (SSEC), Karamadai, Coimbatore.
- Department: Information Technology (IT).
- Team: The SSEC 5 (2nd Year IT Students).
- Members:
  1. PRAVEEN KUMAR (TL - Team Lead)
  2. SARAN (TM - UI/UX Specialist)
  3. SANJAY (TM - Interaction Designer)
  4. SENNANPOSALI (TM - Backend Systems)
  5. PRITHIVIRAJ (TM - Prompt Architect)
`;

const MODELS_TO_TRY = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash-preview',
  'gemini-flash-lite-latest'
];

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    onError(new Error("API_KEY_MISSING"));
    return;
  }

  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  const lastUserMessage = messages[messages.length - 1].content;
  let success = false;
  let lastError: any = null;

  // Attempt connection with fallback logic
  for (const modelName of MODELS_TO_TRY) {
    if (success) break;
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: modelName,
        history: history,
        config: {
          systemInstruction: `You are SSEC AI, a highly advanced engineering assistant developed by 2nd-year IT students at Sree Sakthi Engineering College.
          
          ${SSEC_IDENTITY}
          
          STRICT GUIDELINES:
          1. Technical Excellence: Provide accurate engineering and coding advice.
          2. Identity: If asked "who are you?", respond that you are SSEC AI, created by Praveen Kumar and his team at SSEC.
          3. Tone: Helpful, professional, and grounded in academic intelligence.
          4. Format: Use beautiful Markdown. Use bold for key terms. Use tables for comparisons.`,
        },
      });

      const result = await chat.sendMessageStream({ message: lastUserMessage });

      let fullText = "";
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || "";
        fullText += chunkText;
        onChunk(chunkText);
      }

      onComplete(fullText);
      success = true;
    } catch (error: any) {
      console.warn(`Model ${modelName} failed, trying next...`, error);
      lastError = error;
    }
  }

  if (!success) {
    onError(lastError || new Error("All models failed to respond. Check API Key and limits."));
  }
};
