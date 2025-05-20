import { useState } from 'react';
import ReviewModal from './ReviewModal';

export default function ReviewButton({ recordType, record }: { recordType: 'asset' | 'debt'; record: any; }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-green-600 hover:text-green-900" onClick={() => setOpen(true)}>Review</button>
      <ReviewModal isOpen={open} onClose={() => setOpen(false)} recordType={recordType} record={record} />
    </>
  );
}
