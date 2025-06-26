import { useRef, useEffect, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useFinancialAssistant, Message } from '../../lib/financial-assistant-context';

const MemoizedMessage = memo(function MessageComp({ message }: { message: Message }) {
  // Do not render the AI message bubble until it has content.
  // The `isTyping` indicator is used to show the thinking state instead.
  if (message.sender === 'ai' && message.text.length === 0) {
    return null;
  }

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
  const { toggleChatPanel, messages, addMessage, isTyping } = useFinancialAssistant();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const messageToSend = input;
    setInput('');
    await addMessage(messageToSend);
  };

  const suggestedQuestions = [
    'Am I on track for retirement?',
    'How can I reduce my fees?',
    'What questions should I ask my financial advisor?',
    'Explain my asset allocation.'
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-primary px-4 py-3 text-white flex justify-between items-center">
        <h3 className="text-lg font-medium">Financial Assistant</h3>
        <button onClick={toggleChatPanel} className="text-white">x</button>
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
      <div className="p-4 border-t">
        <p className="text-xs text-gray-500 mb-2">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map(q => (
            <button
              key={q}
              className="btn text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => addMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <form className="border-t border-gray-200 p-4" onSubmit={handleSendMessage}>
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
    </div>
  );
}