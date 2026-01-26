
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

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  // Support for multiple keys separated by commas in the environment variable
  const rawApiKeys = process.env.API_KEY || "";
  const apiKeys = rawApiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (apiKeys.length === 0) {
    console.error("SSEC AI: No API keys found in environment.");
    onError(new Error("CONFIG_ERROR: No API keys detected. Please add your GEMINI_API_KEYs to Vercel Environment Variables as 'API_KEY'."));
    return;
  }

  // Pick a random key from the rotation pool
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
        // Disable thinking budget to minimize latency and ensure immediate replies
        thinkingConfig: { thinkingBudget: 0 },
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

  } catch (error: any) {
    console.error("SSEC AI: Neural link failed.", error);
    // If the error looks like an auth issue, provide a helpful hint
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('403')) {
      onError(new Error("AUTH_ERROR: One of the provided API keys is invalid or restricted. Please verify your Gemini API keys."));
    } else {
      onError(error);
    }
  }
};
