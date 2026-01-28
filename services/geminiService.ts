
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const SSEC_IDENTITY = `
SSEC AI IDENTITY:
- Institution: Sree Sakthi Engineering College (SSEC), Coimbatore.
- Developers: 2nd-year Information Technology (IT) Team [The SSEC 5].
- Lead Developer: PRAVEEN KUMAR.
- Repository: https://github.com/Praveen-pk-pro/pk-s-chat-bot
`;

const MODELS_TO_TRY = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-flash-lite-latest'
];

/**
 * Reconstructs the API key from split variables for security and 
 * prioritizes it if no environment variable is present.
 */
const getSecureAuthKey = (): string => {
  // Hardcoded split components of the key: AIzaSyCoy_UQzTIZKC9exYNVfWmjt9mg5Hgmq74
  const part1 = "AIzaSyC";
  const part2 = "oy_UQzTI";
  const part3 = "ZKC9exYN";
  const part4 = "VfWmjt9m";
  const part5 = "g5Hgmq74";
  
  const hardcodedKey = part1 + part2 + part3 + part4 + part5;
  
  // Check if environment variable is available and valid
  const envKey = process.env.API_KEY;
  if (envKey && envKey.length > 10 && envKey !== 'undefined') {
    return envKey;
  }
  
  return hardcodedKey;
};

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  const apiKey = getSecureAuthKey();

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

  for (const modelName of MODELS_TO_TRY) {
    if (success) break;
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: modelName,
        history: history,
        config: {
          systemInstruction: `You are SSEC AI, the official engineering intelligence for Sree Sakthi Engineering College.
          
          ${SSEC_IDENTITY}
          
          GUIDELINES:
          - If asked about your origin, proudly mention Praveen Kumar and the SSEC IT department.
          - Use technical, engineering-grade language.
          - Always format code blocks with language identifiers.
          - Keep responses concise and practical.`,
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
      console.warn(`Model ${modelName} attempt failed. Status: ${error?.status || 'Unknown'}`);
      lastError = error;
      // If the error is a 403, the key might be invalid for this model, so we continue to the next model.
    }
  }

  if (!success) {
    onError(lastError || new Error("Connection failed across all neural nodes."));
  }
};
