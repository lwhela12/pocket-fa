import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Modal from '../layout/Modal';
import { fetchApi } from '../../lib/api-utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recordType: 'asset' | 'debt';
  record: any;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function ReviewModal({ isOpen, onClose, recordType, record }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
      fetchInitial();
    }
  }, [isOpen]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInitial = async () => {
    setLoading(true);
    const res = await fetchApi<string>(`/api/review/${recordType}`, {
      method: 'POST',
      body: JSON.stringify({ record, history: [], pdfBase64: (record as any).pdfBase64 })
    });
    let newAiText = 'Error processing your request.';
    if (res.success) {
      if (res.data && res.data.trim() !== '') {
        newAiText = res.data;
      } else {
        newAiText = "[The AI didn't provide a specific observation for that.]";
      }
    } else if (res.error) {
      newAiText = res.error;
    }
    setMessages([{ id: Date.now().toString(), sender: 'ai', text: newAiText }]);
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const current = input;
    const historyForServer = messages.map(m => ({ sender: m.sender, text: m.text }));
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: current };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const res = await fetchApi<string>(`/api/review/${recordType}`, {
      method: 'POST',
      body: JSON.stringify({ record, message: current, history: historyForServer, pdfBase64: (record as any).pdfBase64 })
    });
    let newAiText = 'Error processing your request.';
    if (res.success) {
      if (res.data && res.data.trim() !== '') {
        newAiText = res.data;
      } else {
        newAiText = "[The AI didn't provide a specific observation for that.]";
      }
    } else if (res.error) {
      newAiText = res.error;
    }
    setMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: 'ai', text: newAiText }]);
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
