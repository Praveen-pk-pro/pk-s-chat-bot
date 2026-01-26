
import React, { useState, useRef } from 'react';
import { SendIcon, PlusIcon, AudioIcon } from './Icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-[#141414] rounded-[24px] p-2 shadow-2xl border border-white/5">
        <div className="px-4 pt-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Lovable to create a prototype..."
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-white py-3 resize-none outline-none custom-scrollbar disabled:opacity-50 text-[15px] placeholder:text-gray-500 min-h-[50px]"
          />
        </div>
        
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
              <AudioIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                !input.trim() || disabled 
                ? 'bg-white/10 text-gray-600' 
                : 'bg-white text-black hover:bg-gray-200'
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
