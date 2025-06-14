import { useState } from 'react';
import ReviewModal from './ReviewModal';
import { fetchApi } from '../../lib/api-utils';

export default function ReviewButton({ recordType, record }: { recordType: 'asset' | 'debt'; record: any; }) {
  const [open, setOpen] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);

  const handleOpen = async () => {
    const res = await fetchApi<string>('/api/chat/create-context', {
      method: 'POST',
      body: JSON.stringify({ data: record })
    });

    if (res.success && res.data) {
      setContextId(res.data);
      setOpen(true);
    } else {
      console.error(res.error || 'Failed to create context');
    }
  };

  return (
    <>
      <button className="text-green-600 hover:text-green-900" onClick={handleOpen}>Review</button>
      {contextId && (
        <ReviewModal isOpen={open} onClose={() => setOpen(false)} recordType={recordType} contextId={contextId} />
      )}
    </>
  );
}
