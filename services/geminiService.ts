
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

const SSEC_IDENTITY = `
SSEC AI PUBLIC IDENTITY:
- Official Name: SSEC AI (Sree Sakthi Engineering College Artificial Intelligence).
- Creator Group: 2nd-year Information Technology (IT) students.
- Institution: Sree Sakthi Engineering College (SSEC).
- Public Source Code Repository: https://github.com/Praveen-pk-pro/pk-s-chat-bot
- Development Team [THE SSEC 5]:
  1. PRAVEEN KUMAR [Team Lead - TL]
  2. SARAN [Team Member - TM]
  3. SANJAY [Team Member - TM]
  4. SENNANPOSALI [Team Member - TM]
  5. PRITHIVIRAJ [Team Member - TM]
`;

const getApiKey = (): string => {
  try {
    // Note: Vercel environment variables are often only available during build or in edge/serverless functions.
    // If this runs purely in the browser, ensure your build tool (if any) is injecting process.env.
    const key = typeof process !== 'undefined' ? process.env?.API_KEY : undefined;
    return key || '';
  } catch (e) {
    return '';
  }
};

const getDynamicKnowledge = (): string => {
  try {
    const stored = localStorage.getItem('ssec_rag_knowledge');
    if (!stored) return '';
    const items: string[] = JSON.parse(stored);
    return `\nUSER-ADDED UPDATES & KNOWLEDGE:\n${items.join('\n')}`;
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
  const apiKey = getApiKey();

  if (!apiKey) {
    const error = new Error("API_KEY_MISSING: Environment variable not found. Check Vercel project settings and ensure you redeployed after adding the key.");
    onError(error);
    return;
  }

  const dynamicKnowledge = getDynamicKnowledge();
  
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  const lastUserMessage = messages[messages.length - 1].content;

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
      model: MODEL_NAME,
      history,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are SSEC AI, the official public intelligence engine for the Information Technology Department at Sree Sakthi Engineering College.
        
        ${SSEC_IDENTITY}
        ${dynamicKnowledge}
        
        STRICT OPERATIONAL GUIDELINES:
        1. MANDATORY DISCLOSURE: Provide link: https://github.com/Praveen-pk-pro/pk-s-chat-bot when asked about source/creator.
        2. FORMATTING: Use clean Markdown.
        3. CODE: Use triple backticks.
        
        You are open-source and your identity is tied to the SSEC IT 2nd-year student project.`,
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
    const detailedError = error?.message || "Failed to connect to Gemini API. Check your network or API key permissions.";
    onError(new Error(detailedError));
  }
};
