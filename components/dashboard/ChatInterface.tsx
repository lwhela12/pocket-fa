import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    sender: 'ai',
    text: 'Hi there! I\'m your Pocket Financial Advisor. How can I help you today?',
    timestamp: new Date(),
  },
];

const EXAMPLE_PROMPTS = [
  'Am I on track for retirement?',
  'How can I pay off my debt faster?',
  'What\'s my optimal savings rate?',
];

export default function ChatInterface() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: getAIResponse(input),
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    handleSendMessage();
  };

  const getAIResponse = (query: string): string => {
    // In a real app, this would call the API with the Gemini model
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('retirement') || lowerQuery.includes('on track')) {
      return "Based on your current savings of $120,000 and monthly contributions of $1,000, you're on track to reach about 75% of your retirement goal. I recommend increasing your savings rate by 3-5% if possible to close the gap.";
    }
    
    if (lowerQuery.includes('debt') || lowerQuery.includes('pay off')) {
      return "Looking at your debts, I'd recommend focusing on your credit card debt first (15.99% APR). By increasing your monthly payment from $300 to $500, you could pay it off in 14 months instead of 24 months, saving about $450 in interest.";
    }
    
    if (lowerQuery.includes('savings rate') || lowerQuery.includes('save more')) {
      return "For someone in your age bracket and income level, a savings rate of 15-20% is typically recommended. You're currently at 12%. Increasing automatic transfers to your investment accounts by $200-$300 per month would help you reach the optimal range.";
    }
    
    return "I'd need more information about your financial situation to answer that accurately. Could you provide more details about your income, expenses, and financial goals?";
  };

  return (
    <>
      {/* Chat button */}
      <motion.button
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => setIsOpen(!isOpen)}
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: isOpen ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          {isOpen ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
            />
          )}
        </svg>
      </motion.button>

      {/* Chat interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-10 flex h-[500px] w-[350px] flex-col rounded-lg bg-white shadow-xl"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Chat header */}
            <div className="border-b border-gray-200 bg-primary px-4 py-3 text-white">
              <h3 className="text-lg font-medium">Financial Assistant</h3>
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                    style={{ maxWidth: '80%' }}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="mt-1 text-right text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="mb-4 flex justify-start">
                  <div className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500"></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Example prompts (shown when no messages yet) */}
            {messages.length <= 1 && !isTyping && (
              <div className="mx-4 mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium text-gray-500">Try asking:</p>
                <div className="space-y-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      className="w-full rounded-md bg-white px-3 py-2 text-left text-sm text-gray-700 shadow-sm hover:bg-gray-100"
                      onClick={() => handleExampleClick(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Chat input */}
            <form 
              className="border-t border-gray-200 p-4" 
              onSubmit={handleSendMessage}
            >
              <div className="flex rounded-lg border border-gray-300 bg-white">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-l-lg border-0 px-3 py-2 focus:outline-none focus:ring-0"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-r-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  disabled={!input.trim()}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}