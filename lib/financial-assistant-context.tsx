import { createContext, useContext, useState, ReactNode } from 'react';
import { fetchSSE } from './api-utils';

export type Message = { id: string; sender: 'user' | 'ai'; text: string; timestamp: Date };

const getInitialMessage = (text?: string): Message[] => [
  { id: '1', sender: 'ai', text: text || 'Hi there! I\'m your Pocket Financial Advisor. How can I help you today?', timestamp: new Date() },
];

interface FinancialAssistantState {
  isChatOpen: boolean;
  isTyping: boolean;
  chatMode: 'holistic' | 'statement';
  activeStatementId: string | null;
  messages: Message[];
  openChat: (mode: 'holistic' | 'statement', context: { id?: string; name?: string }) => void;
  closeChat: () => void;
  addMessage: (text: string) => Promise<void>;
}

const FinancialAssistantContext = createContext<FinancialAssistantState | null>(null);

export function FinancialAssistantProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<'holistic' | 'statement'>('holistic');
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(getInitialMessage());

  const openChat = (mode: 'holistic' | 'statement', context: { id?: string; name?: string }) => {
    setChatMode(mode);
    setActiveStatementId(context.id || null);
    
    let introText = 'How can I help today?';
    if (mode === 'statement' && context.name) {
      introText = `I see we are talking about your ${context.name} statement. How can I help?`;
    } else if (mode === 'holistic') {
      introText = 'How can I help today?';
    }
    setMessages(getInitialMessage(introText));

    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  const addMessage = async (text: string) => {
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    const aiId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiId, sender: 'ai', text: '', timestamp: new Date() }]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let acc = '';
    await fetchSSE(
      '/api/chat/stream',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: [...messages, userMessage].map(m => ({ sender: m.sender, text: m.text })),
          statementId: chatMode === 'statement' ? activeStatementId : undefined,
        }),
      },
      chunk => {
        acc += chunk;
        setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: acc } : m)));
      },
    );
    setIsTyping(false);
  };

  const value = { isChatOpen, isTyping, chatMode, activeStatementId, messages, openChat, closeChat, addMessage };

  return (
    <FinancialAssistantContext.Provider value={value}>
      {children}
    </FinancialAssistantContext.Provider>
  );
}

export function useFinancialAssistant() {
  const ctx = useContext(FinancialAssistantContext);
  if (!ctx) throw new Error('useFinancialAssistant must be used within provider');
  return ctx;
}