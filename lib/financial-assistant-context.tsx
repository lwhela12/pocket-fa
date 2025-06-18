import { createContext, useContext, useState, ReactNode } from 'react';

interface FinancialAssistantState {
  isChatOpen: boolean;
  chatMode: 'holistic' | 'statement';
  activeStatementId: string | null;
  openChat: (mode: 'holistic' | 'statement', statementId?: string) => void;
  closeChat: () => void;
}

const FinancialAssistantContext = createContext<FinancialAssistantState | null>(null);

export function FinancialAssistantProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'holistic' | 'statement'>('holistic');
  const [activeStatementId, setActiveStatementId] = useState<string | null>(null);

  const openChat = (mode: 'holistic' | 'statement', statementId?: string) => {
    setChatMode(mode);
    setActiveStatementId(statementId || null);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setTimeout(() => {
      setChatMode('holistic');
      setActiveStatementId(null);
    }, 300);
  };

  const value = { isChatOpen, chatMode, activeStatementId, openChat, closeChat };

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
