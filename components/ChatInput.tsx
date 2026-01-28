
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => {
            const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + finalTranscript;
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
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
      // Stop listening if user manually sends
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
    <div className="w-full">
      <div className="bg-[#0f0f0f] rounded-[24px] px-2 py-2 shadow-2xl border border-white/5 group transition-all duration-300 focus-within:border-white/10 ring-1 ring-white/5">
        <div className="flex items-center gap-2">
          {/* Text Area */}
          <div className="flex-1 px-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Write a message..."}
              rows={1}
              disabled={disabled}
              className="w-full bg-transparent text-white/90 py-3 resize-none outline-none disabled:opacity-50 text-[15px] placeholder:text-white/20 min-h-[48px] max-h-[200px] leading-relaxed font-medium"
            />
          </div>
          
          {/* Right Action Group */}
          <div className="flex items-center gap-1 pr-1">
            <button 
              onClick={toggleListening}
              disabled={disabled}
              className={`p-3 transition-all rounded-full ${
                isListening 
                ? 'text-cyan-400 bg-cyan-400/10 animate-pulse scale-110' 
                : 'text-white/40 hover:text-white'
              }`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <AudioIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                !input.trim() || disabled 
                ? 'bg-white/5 text-white/10' 
                : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
              }`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {isListening && (
        <div className="mt-2 flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/5 border border-cyan-400/10">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">Voice Mode Active</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
