import React, { useState, useEffect } from 'react';
import { Message, Role } from '../types';
import { CopyIcon, CheckIcon, AlertCircleIcon, RefreshIcon } from './Icons';

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

const highlightCode = (code: string, lang: string = '') => {
  const tokens = [
    { name: 'comment', regex: /(\/\/.*|\/\*[\s\S]*?\*\/|#.*|<!--[\s\S]*?-->)/g, color: 'text-gray-500 italic' },
    { name: 'string', regex: /(['"`][^'"`]*['"`])/g, color: 'text-amber-200' },
    { name: 'tag', regex: /(<\/?[a-zA-Z0-9\-\:]+\s*\/?>|<[a-zA-Z0-9\-\:]+\s+[^>]*\/?>)/g, color: 'text-pink-400' },
    { name: 'attr', regex: /\b([a-z\-]+)(?==)/g, color: 'text-emerald-300' },
    { name: 'keyword', regex: /\b(const|let|var|function|return|if|else|for|while|import|export|class|interface|type|from|await|async|try|catch|new|this|true|false|null|undefined|def|elif|in|is|lambda|None|self|print|as|with|yield|break|continue|pass|raise|except|finally|and|or|not|del|global|nonlocal|assert|async|await|yield|public|private|protected|static|void|int|float|bool|string|list|dict|set|tuple)\b/g, color: 'text-purple-400' },
    { name: 'number', regex: /\b(\d+)\b/g, color: 'text-orange-300' },
    { name: 'function', regex: /\b([a-zA-Z_]\w*)(?=\s*\()/g, color: 'text-blue-300' }
  ];

  let highlighted: { text: string; type: string; color?: string }[] = [{ text: code, type: 'plain' }];

  tokens.forEach(token => {
    const nextHighlighted: { text: string; type: string; color?: string }[] = [];
    highlighted.forEach(segment => {
      if (segment.type !== 'plain') {
        nextHighlighted.push(segment);
        return;
      }

      let lastIndex = 0;
      let match;
      const regex = new RegExp(token.regex);
      
      while ((match = regex.exec(segment.text)) !== null) {
        if (match.index > lastIndex) {
          nextHighlighted.push({ text: segment.text.slice(lastIndex, match.index), type: 'plain' });
        }
        nextHighlighted.push({ text: match[0], type: token.name, color: token.color });
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < segment.text.length) {
        nextHighlighted.push({ text: segment.text.slice(lastIndex), type: 'plain' });
      }
    });
    highlighted = nextHighlighted;
  });

  return highlighted.map((segment, i) => (
    <span key={i} className={segment.color || ''}>{segment.text}</span>
  ));
};

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const match = code.match(/^```(\w+)?\n?([\s\S]*?)\n?```$/);
  const lang = match?.[1] || '';
  const actualCode = match?.[2] || code.replace(/```/g, '').trim();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(actualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <div className="relative my-6 rounded-xl overflow-hidden bg-[#050505] border border-white/5 group/code shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
          </div>
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest font-bold">{lang || 'plaintext'}</span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all px-2 py-1 rounded hover:bg-white/5 ${copied ? 'text-cyan-400' : 'text-white/30 hover:text-white'}`}
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto custom-scrollbar font-['JetBrains_Mono'] text-[13px] leading-relaxed text-gray-300 whitespace-pre">
        <code>{highlightCode(actualCode, lang)}</code>
      </pre>
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const [copied, setCopied] = useState(false);
  const [statusText, setStatusText] = useState("SSEC AI");
  const isBot = message.role === Role.BOT;

  useEffect(() => {
    if (isBot && message.isStreaming && !message.content) {
      const texts = ["Initializing Retrieval...", "Accessing SSEC Knowledge...", "Analyzing Query Context...", "Generating Grounded Response..."];
      let i = 0;
      const interval = setInterval(() => {
        setStatusText(texts[i % texts.length]);
        i++;
      }, 2000);
      return () => clearInterval(interval);
    } else if (isBot && message.isStreaming) {
      setStatusText("SSEC AI Processing...");
    } else if (isBot && message.isError) {
      setStatusText("System Link Error");
    } else {
      setStatusText(isBot ? "SSEC AI" : "User Entry");
    }
  }, [isBot, message.isStreaming, message.isError, message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const processMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      if (line.startsWith('### ')) {
        return <h3 key={lineIdx} className="text-lg font-bold text-cyan-400 mt-4 mb-2">{processInline(line.slice(4))}</h3>;
      }
      
      const numListMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numListMatch) {
        return (
          <div key={lineIdx} className="flex gap-2 ml-2 mb-1">
            <span className="text-cyan-500 font-mono font-bold">{numListMatch[1]}.</span>
            <span>{processInline(numListMatch[2])}</span>
          </div>
        );
      }

      const bulletMatch = line.match(/^[\*\-]\s+(.*)/);
      if (bulletMatch) {
        return (
          <div key={lineIdx} className="flex gap-2 ml-4 mb-1">
            <span className="text-cyan-500 mt-1">•</span>
            <span>{processInline(bulletMatch[1])}</span>
          </div>
        );
      }

      return line.trim() === '' ? <div key={lineIdx} className="h-2" /> : <p key={lineIdx} className="mb-2 last:mb-0">{processInline(line)}</p>;
    });
  };

  const processInline = (text: string) => {
    const parts = text.split(/(\*\*[\s\S]+?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={i} className="font-bold text-white">{processItalicAndCode(content)}</strong>;
      }
      return processItalicAndCode(part);
    });
  };

  const processItalicAndCode = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-cyan-300 text-[13px] border border-white/5 mx-0.5">
            {part.slice(1, -1)}
          </code>
        );
      }
      const iParts = part.split(/(\*[^*]+\*)/g);
      return iParts.map((ip, j) => {
        if (ip.startsWith('*') && ip.endsWith('*')) {
          return <em key={j} className="italic text-white/80">{ip.slice(1, -1)}</em>;
        }
        return ip;
      });
    });
  };

  const renderContent = () => {
    if (isBot && message.isStreaming && !message.content) {
      return (
        <div className="flex flex-col gap-4 py-4 min-w-[200px]">
          <div className="flex items-end gap-[3px] h-6 px-1">
            {[0, 0.2, 0.4, 0.6, 0.1, 0.3, 0.5].map((delay, idx) => (
              <div 
                key={idx}
                className="w-[3px] bg-cyan-400/80 rounded-full animate-data-stream"
                style={{ animationDelay: `${delay}s`, height: '100%' }}
              />
            ))}
            <span className="ml-3 text-[10px] font-mono text-cyan-400/40 uppercase tracking-[0.2em]">Neural Processing</span>
          </div>
        </div>
      );
    }

    if (isBot && message.isError) {
      return (
        <div className="py-2">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 animate-pulse">
              <AlertCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5">Neural Link Interrupted</h4>
              <p className="text-[10px] text-red-400/60 font-mono">STATUS: CONFIG_REQUIRED</p>
            </div>
          </div>
          <p className="text-red-200/70 text-[14px] leading-relaxed mb-6 italic">
            {message.content}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white px-5 py-2.5 bg-red-500/20 border border-red-500/40 rounded-xl hover:bg-red-500/40 transition-all active:scale-95 group/retry"
            >
              <RefreshIcon className="w-4 h-4 transition-transform duration-500 group-hover/retry:rotate-180" />
              Re-Establish Connection
            </button>
          )}
        </div>
      );
    }

    const segments = message.content.split(/(```[\s\S]*?```)/g);
    const elements = segments.map((segment, index) => {
      if (segment.startsWith('```') && segment.endsWith('```')) {
        return <CodeBlock key={index} code={segment} />;
      }
      return <div key={index} className="w-full">{processMarkdown(segment)}</div>;
    });

    if (isBot && message.isStreaming) {
      elements.push(
        <span key="cursor" className="inline-block w-[3px] h-[15px] ml-1 bg-cyan-400 align-middle cursor-blink" />
      );
    }

    return elements;
  };

  return (
    <div className={`flex w-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[95%] sm:max-w-[85%] lg:max-w-[75%] group ${isBot ? 'items-start' : 'items-end'}`}>
        <div className={`relative px-6 py-4 rounded-2xl leading-relaxed text-[15px] shadow-2xl transition-all duration-300 overflow-hidden ${
          isBot 
            ? message.isError 
              ? 'text-red-400 bg-red-950/10 border border-red-500/20 rounded-tl-none shadow-red-900/10'
              : 'text-gray-200 bg-[#121212] border border-white/5 rounded-tl-none' 
            : 'text-white font-medium bg-white/10 border border-white/10 rounded-tr-none backdrop-blur-sm'
        }`}>
          {!message.isStreaming && !message.isError && (
            <button
              onClick={handleCopy}
              className={`absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 border border-white/10 text-white/40 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 ${copied ? 'text-cyan-400 border-cyan-400/30 opacity-100' : ''}`}
              title="Copy message"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className="relative z-10">
            {renderContent()}
          </div>
        </div>
        
        <div className={`flex items-center gap-2 mt-2.5 px-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isBot && message.isStreaming ? 'text-cyan-400' : (isBot && message.isError ? 'text-red-400' : 'text-white')}`}>
            {statusText}
          </span>
          <span className="text-[10px] text-white/40">•</span>
          <span className="text-[10px] font-mono text-white/40">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
