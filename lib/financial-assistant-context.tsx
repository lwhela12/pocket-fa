import { createContext, useContext, useState, ReactNode } from 'react';

interface FinancialAssistantState {
  contextId: string | null;
  open: boolean;
  setContextId: (id: string | null) => void;
  setOpen: (open: boolean) => void;
}

const FinancialAssistantContext = createContext<FinancialAssistantState>({
  contextId: null,
  open: false,
  setContextId: () => {},
  setOpen: () => {},
});

export function FinancialAssistantProvider({ children }: { children: ReactNode }) {
  const [contextId, setContextId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <FinancialAssistantContext.Provider value={{ contextId, open, setContextId, setOpen }}>
      {children}
    </FinancialAssistantContext.Provider>
  );
}

export function useFinancialAssistant() {
  return useContext(FinancialAssistantContext);
}