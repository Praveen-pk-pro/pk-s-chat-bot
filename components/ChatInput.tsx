
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
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
              placeholder="Write a message..."
              rows={1}
              disabled={disabled}
              className="w-full bg-transparent text-white/90 py-3 resize-none outline-none disabled:opacity-50 text-[15px] placeholder:text-white/20 max-h-[200px] leading-relaxed font-medium"
            />
          </div>
          
          {/* Action Group */}
          <div className="flex items-center gap-2 pb-1 pr-1">
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
    </div>
  );
};

export default ChatInput;
