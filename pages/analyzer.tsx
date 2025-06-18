import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/layout/DashboardLayout';
import Modal from '../components/layout/Modal';
import StatementUploadModal from '../components/dashboard/StatementUploadModal';
import { useFinancialAssistant } from '../lib/financial-assistant-context';
import { Statement } from '@prisma/client';
import { fetchApi } from '../lib/api-utils';
import { NextPageWithLayout } from './_app';

const AnalyzerPage: NextPageWithLayout = () => {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openChat } = useFinancialAssistant();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchStatements = async () => {
    setIsLoading(true);
    const res = await fetchApi<Statement[]>('/api/statements');
    if (res.success && res.data) {
      setStatements(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStatements();
  }, []);

  const handleParsed = () => {
    setIsUploadModalOpen(false);
    fetchStatements();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Statement Analyzer</h1>
        <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
          Upload Statement
        </button>
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
                  <span className={`font-semibold ${stmt.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>{stmt.status}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/statements/${stmt.id}`} className="btn">View Details</Link>
                <button onClick={() => openChat('statement', stmt.id)} className="btn btn-secondary">Review with AI</button>
              </div>
            </div>
          ))
        )}
      </div>
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Statement">
        <StatementUploadModal onClose={() => setIsUploadModalOpen(false)} onParsed={handleParsed} />
      </Modal>
    </div>
  );
};

AnalyzerPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Analyzer | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default AnalyzerPage;
