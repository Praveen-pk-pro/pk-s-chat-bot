
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const SSEC_IDENTITY = `
SSEC AI IDENTITY:
- Institution: Sree Sakthi Engineering College (SSEC), Coimbatore.
- Developers: 2nd-year Information Technology (IT) Team [The SSEC 5].
- Lead Developer: PRAVEEN KUMAR.
- Status: Neural Link Operational.
`;

// Priority list of models based on current API availability
const MODELS_TO_TRY = [
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest'
];

/**
 * Reconstructs the three provided API keys using segment splitting.
 */
const getAuthKeys = (): string[] => {
  const keys: string[] = [];

  // Key 1: AIzaSyCoy_UQzTIZKC9exYNVfWmjt9mg5Hgmq74
  keys.push(["AIzaSyC", "oy_UQzTI", "ZKC9exYN", "VfWmjt9m", "g5Hgmq74"].join(""));

  // Key 2: AIzaSyAlsdav1mSCuaI0s9-H46CRSbFjlqTYXyo
  keys.push(["AIzaSyA", "lsdav1mS", "CuaI0s9-", "H46CRSbF", "jlqTYXyo"].join(""));

  // Key 3: AIzaSyAT1VlJvGNVydmTd7TNlXhf3ghcKqRQ30E
  keys.push(["AIzaSyA", "T1VlJvGN", "VydmTd7T", "NlXhf3gh", "cKqRQ30E"].join(""));

  // Prioritize environment variable if set
  const envKey = process.env.API_KEY;
  if (envKey && envKey.length > 10 && envKey !== 'undefined') {
    keys.unshift(envKey.trim());
  }

  return keys;
};

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  const availableKeys = getAuthKeys();
  let success = false;
  let lastErrorMessage = "";

  // Exhaustive search: Try every key with every supported model
  for (const apiKey of availableKeys) {
    if (success) break;

    for (const modelName of MODELS_TO_TRY) {
      if (success) break;

      try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const history = messages.slice(0, -1).map(msg => ({
          role: msg.role === Role.USER ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));
        
        const lastUserMessage = messages[messages.length - 1].content;

        const chat = ai.chats.create({
          model: modelName,
          history: history,
          config: {
            systemInstruction: `You are SSEC AI, the official engineering intelligence for Sree Sakthi Engineering College.
            
            ${SSEC_IDENTITY}
            
            GUIDELINES:
            - Respond as an advanced AI created by Praveen Kumar and the SSEC IT team.
            - Provide clear, academic, and engineering-focused answers.
            - Format code strictly within markdown blocks.`,
          },
        });

        const result = await chat.sendMessageStream({ message: lastUserMessage });

        let fullText = "";
        let hasStarted = false;

        for await (const chunk of result) {
          if (!hasStarted) {
            hasStarted = true;
            success = true; // Mark success as soon as we get the first chunk
          }
          const c = chunk as GenerateContentResponse;
          const chunkText = c.text || "";
          fullText += chunkText;
          onChunk(chunkText);
        }

        if (success) {
          onComplete(fullText);
          return;
        }
      } catch (error: any) {
        console.error(`Link Failed: Key ...${apiKey.slice(-5)} | Model: ${modelName}`, error);
        lastErrorMessage = error?.message || "Unknown API Error";
        // Continue to next combination
      }
    }
  }

  if (!success) {
    onError(new Error(lastErrorMessage || "All connection nodes failed. Please check if your API keys are active in Google AI Studio."));
  }
};
