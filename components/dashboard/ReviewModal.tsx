import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Modal from '../layout/Modal';

function buildAuthHeaders() {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
    if (!token && process.env.NODE_ENV === 'development') {
      token = 'dev-token';
    }
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recordType: 'asset' | 'debt';
  contextId: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function ReviewModal({ isOpen, onClose, recordType, contextId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (contextId) {
        const payload = JSON.stringify({ contextId });
        navigator.sendBeacon('/api/chat/end-session', payload);
      }
    };
  }, [contextId]);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
      fetchInitial();
    }
  }, [isOpen, contextId]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitial = async () => {
    setLoading(true);
    const res = await fetch(`/api/review/${recordType}`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ contextId }),
    });
    const data = await res.json();
    let newAiText = 'Error processing your request.';
    if (data.success) {
      if (data.data && data.data.trim() !== '') {
        newAiText = data.data;
      } else {
        newAiText = "[The AI didn't provide a specific observation for that.]";
      }
    } else if (data.error) {
      newAiText = data.error;
    }
    setMessages([{ id: Date.now().toString(), sender: 'ai', text: newAiText }]);
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const current = input;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: current };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const res = await fetch(`/api/review/${recordType}`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ contextId, message: current }),
    });

    const aiId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiId, sender: 'ai', text: '' }]);

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const cleaned = chunk.replace(/data:\s*/g, '');
        accumulated += cleaned;
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: accumulated } : m));
      }
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Review" maxWidth="max-w-xl">
      <div className="flex h-80 flex-col">
        <div className="flex-1 overflow-y-auto space-y-2">
          {messages.map(m => (
            <div key={m.id} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block rounded px-3 py-2 ${m.sender === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'} max-w-full`}>
                <ReactMarkdown className="prose whitespace-pre-wrap break-words text-sm">
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={sendMessage} className="mt-2 flex gap-2">
          <input className="flex-1 rounded border px-2" value={input} onChange={e => setInput(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={loading}>Send</button>
        </form>
      </div>
    </Modal>
  );
}
