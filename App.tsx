
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Role, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { streamGeminiResponse } from './services/geminiService';
import { BotIcon } from './components/Icons';

const QUOTES = [
  "Let's build something Lovable",
  "Design is not just what it looks like and feels like. Design is how it works.",
  "First, solve the problem. Then, write the code.",
  "Innovation distinguishes between a leader and a follower.",
  "Simplicity is the ultimate sophistication.",
  "The best way to predict the future is to invent it.",
  "The only way to do great work is to love what you do.",
  "Stay hungry, stay foolish.",
  "Code is like humor. When you have to explain it, it’s bad.",
  "Your most unhappy customers are your greatest source of learning."
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }, []);

  // Quote rotation logic
  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setIsFading(false);
      }, 500); // Half second for fade out
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions, createNewSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  const handleSendMessage = async (content: string) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      timestamp: new Date()
    };

    const initialBotMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: Role.BOT,
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage, initialBotMessage],
          updatedAt: new Date()
        };
      }
      return s;
    }));

    setIsLoading(true);

    await streamGeminiResponse(
      [...(currentSession?.messages || []), userMessage],
      (chunk) => {
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === initialBotMessage.id 
                  ? { ...m, content: m.content + chunk } 
                  : m
              )
            };
          }
          return s;
        }));
      },
      (fullText) => {
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map(m => 
                m.id === initialBotMessage.id 
                  ? { ...m, content: fullText, isStreaming: false } 
                  : m
              )
            };
          }
          return s;
        }));
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {currentSession && currentSession.messages.length > 0 ? (
            <div className="w-full max-w-4xl mx-auto px-4 py-8">
              {currentSession.messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-3xl w-full">
                <div className="mb-8 flex justify-center">
                   <div className="p-3 bg-white/5 rounded-2xl border border-white/10 animate-pulse">
                     <BotIcon className="w-12 h-12 text-white/80" />
                   </div>
                </div>
                <div className={`transition-all duration-500 transform ${isFading ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white px-4">
                    {QUOTES[quoteIndex]}
                  </h2>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="w-full pb-10 pt-2 bg-gradient-to-t from-black/40 to-transparent">
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          
          <footer className="mt-8 text-center">
            <div className="flex justify-center gap-8 mb-4 text-[11px] font-medium text-white/50 tracking-wider">
              <a href="#" className="hover:text-white transition-colors uppercase">About Us</a>
              <a href="#" className="hover:text-white transition-colors uppercase">Donate</a>
              <a href="#" className="hover:text-white transition-colors uppercase">Why it was</a>
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold hover:text-white/60 transition-colors cursor-default">
              Project by: PRAVEEN KUMAR | SARAN | SANJAY | PRITHIVI RAJ | SENNAN POSALI
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
