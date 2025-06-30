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

  // Subscribe to server-sent events for real-time status updates
  useEffect(() => {
    const eventSource = new EventSource('/api/statements/status');

    eventSource.onmessage = event => {
      const data = JSON.parse(event.data);
      setStatements(prevStatements =>
        prevStatements.map(stmt =>
          stmt.id === data.statementId ? { ...stmt, status: data.status } : stmt
        )
      );
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatements();
  }, []);

  const handleUploadComplete = () => {
    setIsUploadModalOpen(false);
    fetchStatements(); // Fetch immediately after upload to show the new statement
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Statement Analyzer</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">Upload and analyze your financial statements</p>
        </div>
        
        {/* Action Buttons - Stack on Mobile */}
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          {statements.length > 0 && (
            <button 
              className="btn btn-secondary w-full sm:w-auto"
              onClick={() => openChat('holistic', {})}
            >
              Overall Review
            </button>
          )}
          <button 
            className="btn btn-primary w-full sm:w-auto"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Statement
          </button>
        </div>
      </div>

      {/* Statements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-2 text-gray-500">Loading statements...</p>
            </div>
          </div>
        ) : statements.length === 0 ? (
          <div className="card text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No statements uploaded</h3>
            <p className="text-gray-500 mb-6">Upload your first financial statement to get started with AI-powered analysis.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Your First Statement
            </button>
          </div>
        ) : (
          statements.map(stmt => (
            <div key={stmt.id} className="card">
              {/* Statement Info Section */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {stmt.fileName}
                    </h3>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
                      <p className="text-sm text-gray-600">
                        {stmt.brokerageCompany || 'Unknown Provider'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          stmt.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : stmt.status === 'FAILED' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {stmt.status}
                        </span>
                        {stmt.status === 'PROCESSING' && (
                          <div className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Link 
                      href={`/dashboard/statements/${stmt.id}`}
                      className={`btn bg-white text-primary ring-1 ring-primary hover:bg-blue-50 text-center ${
                        stmt.status !== 'COMPLETED' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      View Details
                    </Link>
                    <button 
                      onClick={() => openChat('statement', { id: stmt.id, name: stmt.fileName })}
                      className={`btn btn-secondary ${
                        stmt.status !== 'COMPLETED' ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      disabled={stmt.status !== 'COMPLETED'}
                    >
                      Review with AI
                    </button>
                    <button 
                      onClick={() => handleDelete(stmt.id)} 
                      className="btn btn-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        title="Upload Statement"
      >
        <StatementUploadModal 
          onClose={() => setIsUploadModalOpen(false)} 
          onParsed={handleUploadComplete} 
        />
      </Modal>
    </div>
  );
};

AnalyzerPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Analyzer | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default AnalyzerPage;