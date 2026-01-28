import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Role, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { streamGeminiResponse } from './services/geminiService';
import { PlusIcon, AlertCircleIcon } from './components/Icons';

const QUOTES = [
  "SSEC AI: Grounded in Intelligence.",
  "Engineering the future at Sree Sakthi Engineering College.",
  "First, solve the problem. Then, write the code.",
  "Innovation distinguishes between a leader and a follower.",
  "Empowering SSEC IT students through AI.",
  "Code is like humor. When you have to explain it, it’s bad.",
  "Built by SSEC students, for the world."
];

const TEAM_MEMBERS = [
  { name: "PRAVEEN KUMAR", role: "TEAM LEAD [TL]", bio: "Spearheaded the integration of Gemini RAG architecture with the custom SSEC frontend." },
  { name: "SARAN", role: "TEAM MEMBER [TM]", bio: "Lead Frontend Engineer focused on high-performance UI rendering and fluid motion design." },
  { name: "SANJAY", role: "TEAM MEMBER [TM]", bio: "Core UI/UX Designer, crafting the minimalist dark-grid aesthetic and interaction patterns." },
  { name: "SENNANPOSALI", role: "TEAM MEMBER [TM]", bio: "Systems Integration Specialist, managing API connectivity and robust deployment." },
  { name: "PRITHIVIRAJ", role: "TEAM MEMBER [TM]", bio: "Knowledge Specialist, overseeing grounded context retrieval and prompt engineering." }
];

const GITHUB_URL = "https://github.com/Praveen-pk-pro/pk-s-chat-bot";

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('ssec_ai_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('ssec_ai_current_id');
  });

  const [isLoading, setIsLoading] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const hasMessages = currentSession && currentSession.messages.length > 0;

  const saveSessionsToLocal = (updated: ChatSession[]) => {
    localStorage.setItem('ssec_ai_sessions', JSON.stringify(updated));
  };

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Discussion',
      messages: [],
      updatedAt: new Date()
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newSession.id);
    localStorage.setItem('ssec_ai_current_id', newSession.id);
    saveSessionsToLocal(updated);
  }, [sessions]);

  useEffect(() => {
    if (hasMessages) return;
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        setIsFading(false);
      }, 500);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasMessages]);

  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
      localStorage.setItem('ssec_ai_current_id', sessions[0].id);
    }
  }, [sessions, currentSessionId, createNewSession]);

  useEffect(() => {
    if (hasMessages) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentSession?.messages, hasMessages]);

  const handleSendMessage = async (content: string, isRetry = false) => {
    if (!currentSessionId || !currentSession) return;

    let botMessageId = (Date.now() + 1).toString();
    if (!isRetry) {
      const userMessage: Message = { id: Date.now().toString(), role: Role.USER, content, timestamp: new Date() };
      const initialBotMessage: Message = { id: botMessageId, role: Role.BOT, content: '', timestamp: new Date(), isStreaming: true };
      const updated = sessions.map(s => {
        if (s.id === currentSessionId) {
          const newTitle = s.messages.length === 0 ? (content.length > 30 ? content.substring(0, 27) + '...' : content) : s.title;
          return { ...s, title: newTitle, messages: [...s.messages, userMessage, initialBotMessage], updatedAt: new Date() };
        }
        return s;
      });
      setSessions(updated);
      saveSessionsToLocal(updated);
    } else {
      const updated = sessions.map(s => {
        if (s.id === currentSessionId) {
          const lastBotMsg = [...s.messages].reverse().find(m => m.role === Role.BOT);
          if (lastBotMsg) {
            botMessageId = lastBotMsg.id;
            return {
              ...s,
              messages: s.messages.map(m => m.id === botMessageId ? { ...m, content: '', isStreaming: true, isError: false } : m)
            };
          }
        }
        return s;
      });
      setSessions(updated);
      saveSessionsToLocal(updated);
    }

    setIsLoading(true);
    const historyMessages = currentSession.messages.filter(m => !m.isError && m.content.length > 0);
    const finalMessages = isRetry ? historyMessages : [...historyMessages, { id: 'temp', role: Role.USER, content, timestamp: new Date() }];

    await streamGeminiResponse(
      finalMessages,
      (chunk) => {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === botMessageId ? { ...m, content: m.content + chunk } : m)
        } : s));
      },
      (fullText) => {
        setSessions(prev => {
          const updated = prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMessageId ? { ...m, content: fullText, isStreaming: false, isError: false } : m)
          } : s);
          saveSessionsToLocal(updated);
          return updated;
        });
        setIsLoading(false);
        setIsKeyMissing(false);
      },
      (error) => {
        if (error?.message === "API_KEY_MISSING") {
          setIsKeyMissing(true);
        }
        setSessions(prev => {
          const updated = prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMessageId ? { 
              ...m, 
              content: error?.message === "API_KEY_MISSING" ? "Neural link disconnected. Configuration required." : (error?.message || "Connection timed out."), 
              isStreaming: false, 
              isError: true 
            } : m)
          } : s);
          saveSessionsToLocal(updated);
          return updated;
        });
        setIsLoading(false);
      }
    );
  };

  const handleRetry = async () => {
    if (!currentSession) return;
    const userMessages = currentSession.messages.filter(m => m.role === Role.USER);
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, true);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-[#0a0a0a]">
      {/* Centered Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 grid grid-cols-3 items-center px-6 bg-transparent pointer-events-none">
        <div className="flex items-center pointer-events-auto gap-2">
          <button 
            onClick={createNewSession}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
            title="Start New Discussion"
          >
            <PlusIcon className="w-5 h-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>

        <div className={`flex items-center justify-center gap-3 transition-opacity duration-1000 ${hasMessages ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
           <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-white font-['JetBrains_Mono']">
             <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">SSEC AI</span>
           </h1>
           <div className={`w-2 h-2 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse ${isKeyMissing ? 'bg-red-500 shadow-red-500/50' : 'bg-cyan-400'}`} />
        </div>
      </header>

      {/* Main Interface Layer */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <div className="flex-1 relative flex flex-col items-center">
          {/* Static Interaction Screen */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center px-4 transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${
            hasMessages ? 'opacity-0 translate-y-[-20vh] pointer-events-none' : 'opacity-100 translate-y-0'
          }`}>
            <div className="max-w-4xl w-full text-center">
              <div className={`transition-all duration-700 transform ${isFading ? 'opacity-0 scale-98' : 'opacity-100 scale-100'}`}>
                <h2 className="text-4xl md:text-6xl font-serif text-white/80 italic tracking-tight leading-tight mb-20 drop-shadow-sm">
                  {QUOTES[quoteIndex]}
                </h2>
              </div>
            </div>
          </div>

          {/* Active Discussion Feed */}
          <div className={`absolute inset-0 overflow-y-auto custom-scrollbar transition-all duration-1000 ease-out pt-24 ${
              hasMessages ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'
            }`}>
            {currentSession && (
              <div className="w-full max-w-4xl mx-auto px-6 py-12">
                {currentSession.messages.map(msg => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    onRetry={msg.isError ? handleRetry : undefined}
                  />
                ))}
                
                {isKeyMissing && (
                  <div className="mt-8 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-red-500/20 rounded-2xl text-red-400">
                        <AlertCircleIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Connection Required</h3>
                        <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Neural Interface: Offline</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6 text-sm leading-relaxed text-white/60">
                      <p>SSEC AI requires an <strong>API_KEY</strong> environment variable to function. Follow these steps to establish the link:</p>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                          <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-cyan-400 text-black text-[10px] font-black">1</span>
                            Vercel Setup
                          </h4>
                          <p className="text-xs">Navigate to <strong>Settings &gt; Environment Variables</strong>. Add <code>API_KEY</code> with your Gemini key. <strong>Redeploy</strong> to apply changes.</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                          <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-cyan-400 text-black text-[10px] font-black">2</span>
                            Local Setup
                          </h4>
                          <p className="text-xs">Create a <code>.env</code> file in the root directory and add <code>API_KEY=your_key_here</code>.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-40" />
              </div>
            )}
          </div>

          {/* Entry Interface */}
          <div className={`w-full max-w-4xl transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) z-30 px-4 flex flex-col items-center ${
            hasMessages 
              ? 'fixed bottom-4 left-1/2 -translate-x-1/2' 
              : 'relative mt-[72vh]'
          }`}>
             <ChatInput onSend={handleSendMessage} disabled={isLoading} />
             
             <footer className={`w-full mt-6 text-center transition-all duration-1000 ${
               hasMessages ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'
             }`}>
               <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4 whitespace-nowrap">
                 Project by: PRAVEEN KUMAR | SARAN | SANJAY | SENNANPOSALI | PRITHIVIRAJ
               </p>
               <div className="flex justify-center gap-10 text-[10px] font-bold text-white/20 tracking-[0.2em] uppercase">
                 <button onClick={() => setIsAboutOpen(true)} className="hover:text-cyan-400 transition-colors cursor-pointer">About Us</button>
                 <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Repository</a>
               </div>
             </footer>
          </div>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pointer-events-none transition-opacity duration-1000 z-20 ${hasMessages ? 'opacity-100' : 'opacity-0'}`} />
      </main>

      {/* Info Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsAboutOpen(false)} />
          <div className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">SSEC AI Knowledge Hub</h3>
                  <p className="text-white/40 uppercase tracking-widest text-[11px] font-bold">A RAG-Powered Project from Sree Sakthi Engineering College</p>
                </div>
                <button 
                  onClick={() => setIsAboutOpen(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                >
                  <PlusIcon className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {TEAM_MEMBERS.map((member, idx) => (
                  <div key={idx} className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all duration-500">
                    <h4 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-1">
                      {member.name}
                    </h4>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                      {member.role}
                    </p>
                    <p className="text-sm text-white/50 leading-relaxed">
                      {member.bio}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;