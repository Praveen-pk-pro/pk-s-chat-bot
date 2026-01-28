
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, AudioIcon } from './Icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalTranscript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
      if (isListening) {
        recognitionRef.current?.stop();
      }
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full relative">
      <div className="bg-[#0f0f0f] rounded-[28px] p-2 shadow-2xl border border-white/5 transition-all duration-300 focus-within:border-white/20 ring-1 ring-white/5">
        <div className="flex items-end gap-2">
          {/* Text Area */}
          <div className="flex-1 min-h-[48px] px-4 flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Write a message..."}
              rows={1}
              disabled={disabled}
              className="w-full bg-transparent text-white/90 py-3 resize-none outline-none disabled:opacity-50 text-[15px] placeholder:text-white/20 max-h-[200px] leading-relaxed font-medium"
            />
          </div>
          
          {/* Action Group */}
          <div className="flex items-center gap-2 pb-1 pr-1">
            <button 
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={`p-3 rounded-full transition-all duration-300 ${
                isListening 
                  ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' 
                  : 'text-white/30 hover:text-white hover:bg-white/5'
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <AudioIcon className="w-5 h-5" />
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || disabled}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                !input.trim() || disabled 
                  ? 'bg-white/5 text-white/10' 
                  : 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
              }`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {isListening && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <div className="flex gap-1 items-end h-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-1 bg-cyan-400 rounded-full animate-data-stream" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Listening...</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
