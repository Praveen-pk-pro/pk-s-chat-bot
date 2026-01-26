
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

// Hardcoded core knowledge base
const CORE_KNOWLEDGE = `
INTERNAL KNOWLEDGE BASE (CORE):
- SSEC stands for SREE SAKTHI ENGINEERING COLLEGE.
- SSEC AI is a project developed specifically by 2nd-year Information Technology (IT) students.
- Project Team Members and Roles:
  1. PRAVEEN KUMAR [Team Lead - TL]
  2. SARAN [Team Member - TM]
  3. SANJAY [Team Member - TM]
  4. SENNANPOSALI [Team Member - TM]
  5. PRITHIVIRAJ [Team Member - TM]
`;

const getDynamicKnowledge = (): string => {
  try {
    const stored = localStorage.getItem('ssec_rag_knowledge');
    if (!stored) return '';
    const items: string[] = JSON.parse(stored);
    return `\nUSER-ADDED KNOWLEDGE:\n${items.join('\n')}`;
  } catch (e) {
    return '';
  }
};

// Priority list of API keys provided by the user + standard fallback
const API_KEYS = [
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
  process.env.API_KEY
].filter(Boolean) as string[];

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  const dynamicKnowledge = getDynamicKnowledge();
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  const lastUserMessage = messages[messages.length - 1].content;

  // Attempt to use keys in sequence
  for (let i = 0; i < API_KEYS.length; i++) {
    const currentKey = API_KEYS[i];
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      const chat = ai.chats.create({
        model: MODEL_NAME,
        history,
        config: {
          systemInstruction: `You are SSEC AI, a sophisticated RAG-enabled assistant. 
          ${CORE_KNOWLEDGE}
          ${dynamicKnowledge}
          
          INSTRUCTIONS:
          1. If a user asks about SSEC or its team, use the CORE KNOWLEDGE.
          2. If a user asks about topics found in USER-ADDED KNOWLEDGE, use that information to answer.
          3. DO NOT proactively introduce yourself. ONLY share identity information if asked.
          4. Maintain a helpful, direct, and intelligent tone.
          
          TECHNICAL GUIDELINES:
          - Provide accurate and direct information. 
          - DO NOT use markdown symbols like asterisks (**) or hashes (#).
          - Use triple backticks for code.
          - Respond naturally.`,
        },
      });

      const responseStream = await chat.sendMessageStream({ message: lastUserMessage });

      let fullText = "";
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || "";
        fullText += chunkText;
        onChunk(chunkText);
      }

      onComplete(fullText);
      return; // Success, exit the loop

    } catch (error: any) {
      console.warn(`SSEC AI: Key ${i + 1} failed or busy. Attempting fallback...`, error);
      
      // If we've exhausted all keys, trigger the error callback
      if (i === API_KEYS.length - 1) {
        console.error("SSEC AI: All API endpoints exhausted or unreachable.");
        onError(error);
      }
      
      // Otherwise, continue to the next key in the loop
      continue;
    }
  }
};
