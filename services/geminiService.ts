
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
  if (!process.env.API_KEY) {
    const error = new Error("API Key is missing. Please establish a Neural Link.");
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
    // Create a new instance right before the call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const chat = ai.chats.create({
      model: MODEL_NAME,
      history,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are SSEC AI, the official public intelligence engine for the Information Technology Department at Sree Sakthi Engineering College.
        
        ${SSEC_IDENTITY}
        ${dynamicKnowledge}
        
        STRICT OPERATIONAL GUIDELINES:
        1. MANDATORY DISCLOSURE: If anyone asks about your "code", "repository", "github", "source", or "who made you", you MUST provide the link: https://github.com/Praveen-pk-pro/pk-s-chat-bot and credit the SSEC IT student team.
        2. DATA RETRIEVAL: Use the USER-ADDED UPDATES section to answer questions about specific data added via the ADD command.
        3. FORMATTING: Use clean Markdown. Avoid excessive asterisks.
        4. CODE: Only use triple backticks (\`\`\`) for block code segments.
        5. HONESTY: If a query asks for information not in your identity or added knowledge, simply state that the specific data is not in your current grounding buffer.
        
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
    onError(error);
  }
};
