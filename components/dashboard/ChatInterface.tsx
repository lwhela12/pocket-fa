import { useState, useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinancialAssistant } from '../../lib/financial-assistant-context';

export type Message = { id: string; sender: 'user' | 'ai'; text: string; timestamp: Date };

const INITIAL_MESSAGES: Message[] = [
  { id: '1', sender: 'ai', text: 'Hi there! I\'m your Pocket Financial Advisor. How can I help you today?', timestamp: new Date() },
];

const MemoizedMessage = memo(function MessageComp({ message }: { message: Message }) {
  return (
    <div className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg px-4 py-2 ${message.sender === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'} max-w-full`}>
        <ReactMarkdown className="prose whitespace-pre-wrap break-words text-sm">{message.text}</ReactMarkdown>
        <p className="mt-1 text-right text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
});

export default function ChatInterface() {
  const { isChatOpen, closeChat, chatMode, activeStatementId, openChat } = useFinancialAssistant();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isChatOpen) {
      setMessages(INITIAL_MESSAGES);
      setInput('');
    }
  }, [isChatOpen]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: input, timestamp: new Date() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    const aiId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiId, sender: 'ai', text: '', timestamp: new Date() }]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: userMessage.text,
        history: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
        statementId: chatMode === 'statement' ? activeStatementId : undefined,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    let buffer = '';
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const cleaned = part.replace(/data:\s*/g, '').trim();
          if (!cleaned) continue;
          try {
            acc += JSON.parse(cleaned);
            setMessages(prev =>
              prev.map(m => (m.id === aiId ? { ...m, text: acc } : m))
            );
          } catch (err) {
            console.error('Failed to parse chunk', cleaned, err);
          }
        }
      }
    }
    setIsTyping(false);
  };

  return (
    <>
      <motion.button
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => (isChatOpen ? closeChat() : openChat('holistic'))}
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: isChatOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isChatOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          )}
        </svg>
      </motion.button>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-10 flex h-[500px] w-[350px] flex-col rounded-lg bg-white shadow-xl"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="border-b border-gray-200 bg-primary px-4 py-3 text-white flex justify-between items-center">
              <h3 className="text-lg font-medium">Financial Assistant</h3>
              <button onClick={closeChat} className="text-white">x</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map(m => (
                <MemoizedMessage key={m.id} message={m} />
              ))}
              {isTyping && (
                <div className="mb-4 flex justify-start">
                  <div className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.2s' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="border-t border-gray-200 p-4" onSubmit={sendMessage}>
              <div className="flex rounded-lg border border-gray-300 bg-white">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-l-lg border-0 px-3 py-2 focus:outline-none focus:ring-0"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="rounded-r-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50" disabled={!input.trim()}>
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
