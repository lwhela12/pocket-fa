import { useState } from 'react';
import { fetchApi } from '../../lib/api-utils';

export interface StatementSummary {
  brokerageCompany: string;
  accountCount: number;
  accounts: any[];
  qualitativeSummary: string;
}

interface Props {
  onClose: () => void;
  onParsed: (data: StatementSummary) => void;
}

const StatementUploadModal = ({ onClose, onParsed }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }
    setFile(selected);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await fetchApi<StatementSummary>('/api/statement-upload', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, file: base64 }),
      });
      if (response.success && response.data) {
        onParsed(response.data);
        onClose();
      } else {
        setError(response.error || 'Failed to process statement');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="btn"
          disabled={isUploading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleUpload}
          className="btn btn-primary"
          disabled={!file || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

export default StatementUploadModal;
export type { StatementSummary };
