
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Role, Message, ChatSession } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { streamGeminiResponse } from './services/geminiService';
import { BotIcon, TerminalIcon, PlusIcon, MenuIcon, XIcon, TrashIcon, PencilIcon, CheckIcon } from './components/Icons';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
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
    setIsSidebarOpen(false);
  }, [sessions]);

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessionsToLocal(updated);
    
    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        localStorage.setItem('ssec_ai_current_id', updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const startRename = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitle(title);
  };

  const confirmRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editingSessionId) {
      const updated = sessions.map(s => 
        s.id === editingSessionId ? { ...s, title: editTitle || 'Untitled Chat' } : s
      );
      setSessions(updated);
      saveSessionsToLocal(updated);
      setEditingSessionId(null);
    }
  };

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

    // Check for ADD(DATA="...", PASS=8344) command
    const addMatch = content.match(/ADD\(DATA="([^"]+)",\s*PASS=(\d+)\)/i);
    if (addMatch) {
      const data = addMatch[1];
      const pass = addMatch[2];

      const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content, timestamp: new Date() };
      
      let botResponse = "";
      if (pass === "8344") {
        try {
          const currentKnowledge = JSON.parse(localStorage.getItem('ssec_rag_knowledge') || '[]');
          currentKnowledge.push(data);
          localStorage.setItem('ssec_rag_knowledge', JSON.stringify(currentKnowledge));
          botResponse = `SUCCESS: Data has been ingested into the SSEC AI Knowledge Hub. Retrieval systems updated. Grounding now active for: "${data}"`;
        } catch (e) {
          botResponse = "ERROR: Failed to update internal knowledge buffer.";
        }
      } else {
        botResponse = "ERROR: Unauthorized access. Knowledge ingestion requires a valid secondary bypass key.";
      }

      const botMsg: Message = { id: (Date.now() + 1).toString(), role: Role.BOT, content: botResponse, timestamp: new Date() };
      
      const updated = sessions.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg, botMsg], updatedAt: new Date() } : s);
      setSessions(updated);
      saveSessionsToLocal(updated);
      return;
    }

    let botMessageId = (Date.now() + 1).toString();
    
    if (!isRetry) {
      const userMessage: Message = { id: Date.now().toString(), role: Role.USER, content, timestamp: new Date() };
      const initialBotMessage: Message = { id: botMessageId, role: Role.BOT, content: '', timestamp: new Date(), isStreaming: true };

      const updated = sessions.map(s => {
        if (s.id === currentSessionId) {
          const newTitle = s.messages.length === 0 
            ? content.length > 30 ? content.substring(0, 27) + '...' : content
            : s.title;
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
    const finalMessages = isRetry 
      ? historyMessages 
      : [...historyMessages, { id: 'temp', role: Role.USER, content, timestamp: new Date() }];

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
      },
      (error) => {
        setSessions(prev => {
          const updated = prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMessageId ? { 
              ...m, 
              content: "The neural connection to SSEC AI core was unstable. Please check your network or API throughput and try again.", 
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

  const handleRetry = () => {
    if (!currentSession) return;
    const userMessages = currentSession.messages.filter(m => m.role === Role.USER);
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, true);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-[#0a0a0a]">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-[#0d0d0d] border-r border-white/5 z-[60] transition-transform duration-500 ease-in-out flex flex-col ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Neural Archive</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-white/40 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 mb-6">
          <button 
            onClick={createNewSession}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group active:scale-95"
          >
            <div className="p-1.5 bg-cyan-400/10 rounded-lg group-hover:bg-cyan-400/20 transition-colors">
              <PlusIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-white/80">New Connection</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                localStorage.setItem('ssec_ai_current_id', session.id);
                setIsSidebarOpen(false);
              }}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-300 border ${
                currentSessionId === session.id 
                  ? 'bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className={`w-1 h-1 rounded-full transition-colors ${
                currentSessionId === session.id ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'
              }`} />
              
              <div className="flex-1 min-w-0 pr-10">
                {editingSessionId === session.id ? (
                  <form onSubmit={confirmRename} onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      className="w-full bg-white/5 border border-cyan-500/30 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => confirmRename()}
                    />
                  </form>
                ) : (
                  <p className={`text-xs font-medium truncate ${currentSessionId === session.id ? 'text-white' : 'text-white/40'}`}>
                    {session.title}
                  </p>
                )}
                <p className="text-[9px] font-mono text-white/20 mt-0.5">
                  {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className={`absolute right-2 flex items-center gap-1 transition-opacity ${
                currentSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button 
                  onClick={(e) => startRename(session.id, session.title, e)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => deleteSession(session.id, e)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
              SSEC
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/80">SSEC AI Hub</p>
              <p className="text-[9px] text-white/30 uppercase tracking-widest">v1.2.0 Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Header Bar */}
      <header className={`fixed top-0 right-0 z-40 h-16 flex items-center justify-between px-6 bg-transparent pointer-events-none transition-all duration-500 ${
        isSidebarOpen ? 'lg:left-[280px]' : 'left-0 lg:left-[280px]'
      }`}>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white pointer-events-auto"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className={`flex items-center gap-3 transition-opacity duration-1000 ${hasMessages ? 'opacity-100' : 'opacity-0'}`}>
           <h1 className="hidden md:block text-sm font-bold tracking-[0.3em] uppercase text-white/40 font-['JetBrains_Mono']">
             <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">SSEC AI</span> Archive
           </h1>
           <div className="w-8 h-8 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
           </div>
        </div>
      </header>

      {/* Content Main Container */}
      <main className={`flex-1 flex flex-col relative z-10 overflow-hidden transition-all duration-500 ${
        isSidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[280px]'
      }`}>
        <div className="flex-1 relative flex flex-col items-center">
          {/* Static Centered Content (shown when no messages) */}
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

          {/* Active Chat Messages */}
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
                <div ref={messagesEndRef} className="h-40" />
              </div>
            )}
          </div>

          {/* Input Interface */}
          <div className={`w-full max-w-4xl transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) z-30 px-4 flex flex-col items-center ${
            hasMessages 
              ? 'fixed bottom-4 left-1/2 lg:left-[calc(50%+140px)] -translate-x-1/2' 
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
                 <a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a>
                 <a href="#" className="hover:text-cyan-400 transition-colors">SSEC IT</a>
               </div>
             </footer>
          </div>
        </div>

        <div className={`fixed bottom-0 left-0 lg:left-[280px] right-0 h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pointer-events-none transition-opacity duration-1000 z-20 ${hasMessages ? 'opacity-100' : 'opacity-0'}`} />
      </main>

      {/* About Us Modal */}
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
                
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/5 flex flex-col justify-center">
                  <h4 className="text-lg font-bold text-white mb-2">Dynamic RAG Core</h4>
                  <p className="text-sm text-white/60 italic leading-relaxed">
                    "This system supports real-time ingestion of data via secured command protocols for persistent academic grounding."
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 p-6 flex items-center justify-center border-t border-white/5">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">© 2025 SSEC IT | Information Technology Department</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
