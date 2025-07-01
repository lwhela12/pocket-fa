
import { useRouter } from 'next/router';
import useSWR from 'swr';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import StatementDetails from '../../../components/dashboard/StatementDetails';
import { Statement } from '@prisma/client';
import { StatementSummary } from '../../api/statement-upload';
import { fetchApi } from '../../../lib/api-utils'; // Import the correct fetcher
import { useFinancialAssistant } from '../../../lib/financial-assistant-context';

// Use the project-specific fetchApi utility for SWR
const fetcher = (url: string) => fetchApi(url).then(res => {
  if (!res.success) {
    throw new Error(res.error);
  }
  return res;
});

export default function StatementDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { openChat } = useFinancialAssistant();

  const { data, error } = useSWR<{ success: boolean, data?: Statement, error?: string }>(id ? `/api/statements/${id}` : null, fetcher);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {error && <div className="text-red-500">Failed to load statement: {error.message}</div>}
        {!data && !error && <div>Loading...</div>}

        {data?.success && data.data && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Statement: {data.data.fileName}</h1>
                <p className="text-sm text-gray-500">Status: <span className={`font-semibold ${data.data.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>{data.data.status}</span></p>
              </div>
              <button 
                onClick={() => openChat('statement', { id: data.data.id, name: data.data.fileName })}
                className="btn btn-primary"
              >
                Review with AI
              </button>
            </div>
            
            <StatementDetails data={data.data.parsedData as StatementSummary} />
          </>
        )}

        {data && !data.success && (
          <div className="text-red-500">Error: {data.error || 'Could not fetch statement details.'}</div>
        )}
      </div>
    </DashboardLayout>
  );
}

