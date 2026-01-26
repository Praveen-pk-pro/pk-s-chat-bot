
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

export const streamGeminiResponse = async (
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: any) => void
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Convert our message format to Gemini's history format
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are Gemini Pulse, a helpful, intelligent, and highly professional AI assistant. Provide clear, concise, and accurate information. Use markdown for formatting, especially for code blocks, bold text, and lists.",
      },
    });

    const lastUserMessage = messages[messages.length - 1].content;
    const responseStream = await chat.sendMessageStream({ message: lastUserMessage });

    let fullText = "";
    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(chunkText);
    }

    onComplete(fullText);
  } catch (error) {
    console.error("Gemini API Error:", error);
    onError(error);
  }
};
