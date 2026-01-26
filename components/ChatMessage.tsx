
import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === Role.BOT;

  return (
    <div className={`flex w-full py-8 ${isBot ? 'bg-white/5' : 'bg-transparent'} rounded-2xl mb-4 transition-all hover:bg-white/[0.07]`}>
      <div className="max-w-4xl mx-auto flex gap-6 px-6 w-full">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isBot ? 'bg-[#4d6b6b]' : 'bg-indigo-500/20 border border-indigo-500/30'}`}>
           <span className="text-[10px] font-bold">{isBot ? 'AI' : 'YOU'}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className={`prose prose-invert max-w-none leading-relaxed whitespace-pre-wrap text-[15px] ${isBot ? 'text-gray-200' : 'text-white'}`}>
            {message.content}
            {message.isStreaming && <span className="inline-block w-2 h-5 ml-1 bg-[#a5f3fc] animate-pulse align-middle" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
