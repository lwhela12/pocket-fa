import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/layout/DashboardLayout';
import Modal from '../components/layout/Modal';
import StatementUploadModal from '../components/dashboard/StatementUploadModal';
import { useFinancialAssistant } from '../lib/financial-assistant-context';
import { Statement } from '@prisma/client';
import { fetchApi } from '../lib/api-utils';
import { NextPageWithLayout } from './_app';

const POLLING_INTERVAL = 5000; // 5 seconds

const AnalyzerPage: NextPageWithLayout = () => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openChat } = useFinancialAssistant();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatements = async () => {
    // Only show initial loading spinner on first load
    if (statements.length === 0) {
        setIsLoading(true);
    }
    try {
      const res = await fetchApi<Statement[]>('/api/statements');
      if (res.success && res.data) {
        setStatements(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch statements:", error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (stmtId: string) => {
    if (!confirm('Are you sure you want to delete this statement?')) return;
    const res = await fetchApi<Statement>(`/api/statements/${stmtId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      fetchStatements();
    } else {
      alert(res.error || 'Failed to delete statement');
    }
  };

  // Effect for polling to automatically update statement statuses
  useEffect(() => {
    const isProcessing = statements.some(s => s.status === 'PROCESSING');

    if (isProcessing && !pollingRef.current) {
      console.log('A statement is processing. Starting polling...');
      pollingRef.current = setInterval(fetchStatements, POLLING_INTERVAL);
    } else if (!isProcessing && pollingRef.current) {
      console.log('All statements processed. Stopping polling.');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [statements, isLoading]);

  // Initial fetch
  useEffect(() => {
    fetchStatements();
  }, []);

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    fetchStatements(); // Fetch immediately after upload to show the new statement
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Statement Analyzer</h1>
        <div className="flex gap-2">
          {statements.length > 0 && (
            <button className="btn" onClick={() => openChat('holistic', {})}>
              Overall Review
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
            Upload Statement
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          statements.map(stmt => (
            <div key={stmt.id} className="card flex justify-between items-center">
              <div>
                <p className="font-bold">{stmt.fileName}</p>
                <p>
                  {stmt.brokerageCompany || 'Unknown'} -{' '}
                  <span className={`font-semibold ${stmt.status === 'COMPLETED' ? 'text-green-600' : stmt.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {stmt.status}
                    {stmt.status === 'PROCESSING' && <span className="inline-block w-2 h-2 ml-2 bg-yellow-500 rounded-full animate-pulse"></span>}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/statements/${stmt.id}`} className={`btn ${stmt.status !== 'COMPLETED' ? 'disabled' : ''}`}>View Details</Link>
                <button 
                  onClick={() => openChat('statement', { id: stmt.id, name: stmt.fileName })}
                  className={`btn btn-secondary ${stmt.status !== 'COMPLETED' ? 'disabled' : ''}`}>
                    Review with AI
                </button>
                <button onClick={() => handleDelete(stmt.id)} className="btn btn-error">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Statement">
        <StatementUploadModal onClose={() => setIsUploadModalOpen(false)} onParsed={handleUploadComplete} />
      </Modal>
    </div>
  );
};

AnalyzerPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Analyzer | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default AnalyzerPage;