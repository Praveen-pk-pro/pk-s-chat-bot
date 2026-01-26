
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

// Hardcoded Key Pool - Rotated per request to prevent 503 Busy errors
const FALLBACK_KEYS = [
  "AIzaSyA4YzJ6EvUNE3KJ0yYSMfsh02vgV-uuqrY",
  "AIzaSyBw75cGJ00X3yZ3OIb4iwjHMtyMXxP-fuc",
  "AIzaSyBMf5ay8auGwaMXi2pECRk8UuEtlZRksGw"
];

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
    return `\nUSER-ADDED GROUNDED CONTEXT:\n${items.join('\n')}`;
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
  // Use environment keys if available, otherwise rotate fallback pool
  const rawApiKeys = process.env.API_KEY || "";
  let apiKeys = rawApiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (apiKeys.length === 0) {
    apiKeys = FALLBACK_KEYS;
  }

  const selectedKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
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
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for zero-latency
        systemInstruction: `You are SSEC AI, the official intelligence hub for Sree Sakthi Engineering College. 
        ${CORE_KNOWLEDGE}
        ${dynamicKnowledge}
        
        STRICT RULES:
        1. Access the USER-ADDED GROUNDED CONTEXT to answer questions about specific data added via the ADD command.
        2. Never use asterisks or markdown formatting like bold/italics unless for code blocks.
        3. Keep responses technical, efficient, and direct.
        4. If data is missing from context, state that the knowledge buffer has not yet been initialized for that query.`,
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
    console.error("SSEC AI: Stream error.", error);
    onError(error);
  }
};
