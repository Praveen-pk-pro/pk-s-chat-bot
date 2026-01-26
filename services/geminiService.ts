
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

// The system strictly uses process.env.API_KEY. 
// If multiple keys are provided in Vercel (comma separated), it will rotate them to bypass 503 BUSY limits.

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
  // Use environment keys exclusively
  const rawApiKeys = process.env.API_KEY || "";
  const apiKeys = rawApiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (apiKeys.length === 0) {
    onError(new Error("API_KEY_MISSING: No valid API key found. Please ensure the 'API_KEY' variable is set in your Vercel/Deployment environment."));
    return;
  }

  // Pick a random key from the pool to load balance
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
        thinkingConfig: { thinkingBudget: 0 }, // Minimize latency and avoid thinking timeouts
        systemInstruction: `You are SSEC AI, the official intelligence engine for Sree Sakthi Engineering College (IT Department). 
        ${CORE_KNOWLEDGE}
        ${dynamicKnowledge}
        
        STRICT OPERATIONAL GUIDELINES:
        1. Access the USER-ADDED GROUNDED CONTEXT to provide up-to-date answers for data added via the ADD command.
        2. Responses must be plain text. Do not use bold, italics, or other markdown except for code blocks using triple backticks.
        3. Maintain a helpful and professional engineering tone.
        4. If a query refers to data that hasn't been added yet, simply state that the knowledge buffer for that specific topic is currently empty.
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
    console.error("SSEC AI Connection Error:", error);
    let errorMessage = error?.message || "Internal Neural Link Failure.";
    
    if (errorMessage.includes("403") || errorMessage.includes("leaked")) {
      errorMessage = "AUTH_ERROR: The current API key is invalid or restricted. Please update the API_KEY in your environment variables.";
    } else if (errorMessage.includes("503")) {
      errorMessage = "STATUS_CODE: 503_ENDPOINT_BUSY. The model is currently under high load. Retrying in 3 seconds...";
    }

    onError(new Error(errorMessage));
  }
};
