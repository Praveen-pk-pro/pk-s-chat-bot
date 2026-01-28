
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
    <div className