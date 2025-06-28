import { useRef, useEffect, memo, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useFinancialAssistant, Message } from '../../lib/financial-assistant-context';

const MemoizedMessage = memo(function MessageComp({ message }: { message: Message }) {
  if (message.sender === 'ai' && message.text.length === 0) {
    return null;
  }

  return (
    <div className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
        message.sender === 'user' 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
          : 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 shadow-sm border border-gray-200'
      }`}>
        <ReactMarkdown className="prose prose-sm whitespace-pre-wrap break-words">
          {message.text}
        </ReactMarkdown>
        <p className={`mt-2 text-right text-xs ${
          message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
        }`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
});

export default function ChatInterface() {
  const { toggleChatPanel, messages, addMessage, isTyping } = useFinancialAssistant();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === 'ai') {
      setShowSuggestions(true);
    } else if (messages.some(m => m.sender === 'user')) {
      setShowSuggestions(false);
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const messageToSend = input;
    setInput('');
    setShowSuggestions(false);
    await addMessage(messageToSend);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const suggestedQuestions = [
    'Am I on track for retirement?',
    'How can I reduce my fees?',
    'What questions should I ask my financial advisor?',
    'Explain my asset allocation.'
  ];

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-50 bg-white/95 backdrop-blur-lg flex flex-col"
    : "flex h-full flex-col";

  const overlay = isFullscreen ? (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={toggleFullscreen} />
  ) : null;

  const chatUI = (
    <div className={containerClasses}>
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white shadow-lg">
          <button
            onClick={toggleFullscreen}
            className="absolute inset-y-0 right-12 my-auto p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
          <button
            onClick={toggleChatPanel}
            className="absolute inset-y-0 right-2 my-auto w-7 h-7 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all duration-200 hover:scale-110 shadow-lg border-2 border-white"
            title="Hide Chat"
          >
            ×
          </button>

          <div className="flex items-center justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg">
                AI
              </div>
              <h3 className="text-lg font-semibold">Financial Assistant</h3>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ 
          maxHeight: isFullscreen ? 'calc(100vh - 200px)' : 'calc(100vh - 300px)' 
        }}>
          {messages.map(m => (
            <MemoizedMessage key={m.id} message={m} />
          ))}
          
          {isTyping && (
            <div className="mb-4 flex justify-start">
              <div className="rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 text-gray-800 shadow-sm border border-gray-200">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '0.2s' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="p-4 border-t border-gray-200/50 bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-3 font-medium">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map(q => (
                <button
                  key={q}
                  className="text-xs bg-white/80 text-gray-700 hover:bg-blue-50 hover:text-blue-700 px-3 py-2 rounded-lg border border-gray-200/80 transition-all duration-200 hover:shadow-sm"
                  onClick={() => {
                    setShowSuggestions(false);
                    addMessage(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form className="p-4 border-t border-gray-200/50 bg-white/80" onSubmit={handleSendMessage}>
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-medium"
              disabled={!input.trim()}
            >
              Send
            </button>
          </div>
        </form>
    </div>
  );

  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(
      <>
        {overlay}
        {chatUI}
      </>,
      document.body
    );
  }

  return chatUI;
}
