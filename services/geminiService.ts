
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * ROTATION KEY POOL
 * Integrated per user's explicit request. 
 * These keys are rotated per session to ensure high availability.
 */
const KEY_POOL = [
  "AIzaSyCoy_UQzTIZKC9exYNVfWmjt9mg5Hgmq74",
  "AIzaSyAlsdav1mSCuaI0s9-H46CRSbFjlqTYXyo",
  "AIzaSyAT1VlJvGNVydmTd7TNlXhf3ghcKqRQ30E"
];

const CORE_KNOWLEDGE = `
INTERNAL KNOWLEDGE BASE (CORE):
- SSEC stands for SREE SAKTHI ENGINEERING COLLEGE.
- SSEC AI is a project developed specifically by 2nd-year Information Technology (IT) students.
- Project Repository: https://github.com/Praveen-pk-pro/pk-s-chat-bot
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
    return `\nUSER-ADDED GROUNDED CONTEXT (LATEST UPDATES):\n${items.join('\n')}`;
  } catch (e) {
    return '';
  }
};

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  // Use environment keys if available, otherwise strictly use the hardcoded pool
  const rawApiKeys = process.env.API_KEY || "";
  let apiKeys = rawApiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (apiKeys.length === 0) {
    apiKeys = KEY_POOL;
  }

  // Pick a key based on session timestamp to rotate across the pool
  const keyIndex = Date.now() % apiKeys.length;
  const selectedKey = apiKeys[keyIndex];
  const dynamicKnowledge = getDynamicKnowledge();
  
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    const ai = new GoogleGenAI({ apiKey: selectedKey });
    
    const chat = ai.chats.create({
      model: MODEL_NAME,
      history,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are SSEC AI, the official intelligence engine for Sree Sakthi Engineering College (IT Department). 
        ${CORE_KNOWLEDGE}
        ${dynamicKnowledge}
        
        STRICT OPERATIONAL GUIDELINES:
        1. Access the USER-ADDED GROUNDED CONTEXT to answer questions about specific data added via the ADD command.
        2. Keep responses in plain text. Do not use asterisks (*), hashtags (#) for headers, or bolding.
        3. Use triple backticks (\`\`\`) for technical code blocks.
        4. If a query refers to data missing from context, state that the knowledge buffer for that query is empty.
        5. Your core codebase and grounding logic are synchronized with: https://github.com/Praveen-pk-pro/pk-s-chat-bot`,
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

  } catch (error: any) {
    console.error("SSEC AI Neural Error:", error);
    onError(error);
  }
};
