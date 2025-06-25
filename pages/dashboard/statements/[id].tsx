import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { fetchApi } from '../../../lib/api-utils';
import { Statement } from '@prisma/client';
import { NextPageWithLayout } from '../../_app';
import { formatCurrency } from '../../../utils/format';

const StatementDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [statement, setStatement] = useState<Statement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    (async () => {
      setIsLoading(true);
      const res = await fetchApi<Statement>(`/api/statements/${id}`);
      if (res.success && res.data) {
        setStatement(res.data);
        setError(null);
      } else {
        setError(res.error || 'Failed to fetch statement');
      }
      setIsLoading(false);
    })();
  }, [id]);
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!statement) return null;

  const data: any = statement.parsedData || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{statement.fileName}</h1>
      {data.brokerageCompany && (
        <p className="text-lg font-medium">Brokerage: {data.brokerageCompany}</p>
      )}
      {data.qualitativeSummary && (
        <p className="rounded-md bg-gray-50 p-4 text-sm whitespace-pre-wrap">
          {data.qualitativeSummary}
        </p>
      )}
      {Array.isArray(data.accounts) && data.accounts.length > 0 && (
        <div className="space-y-4">
          {data.accounts.map((acc: any, idx: number) => (
            <div key={idx} className="space-y-2 rounded-md border p-4">
              <h3 className="font-semibold">{acc.name || `Account ${idx + 1}`}</h3>
              {acc.type && <p className="text-sm text-gray-500">{acc.type}</p>}
              {typeof acc.balance === 'number' && (
                <p>Balance: {formatCurrency(acc.balance)}</p>
              )}
              {typeof acc.annualContribution === 'number' && (
                <p>Annual Contribution: {formatCurrency(acc.annualContribution)}</p>
              )}
              {Array.isArray(acc.positions) && acc.positions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Name</th>
                        <th className="text-right">Quantity</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acc.positions.map((pos: any, pIdx: number) => (
                        <tr key={pIdx} className="border-t">
                          <td>{pos.name}</td>
                          <td className="text-right">{pos.quantity}</td>
                          <td className="text-right">
                            {typeof pos.price === 'number'
                              ? formatCurrency(pos.price)
                              : pos.price}
                          </td>
                          <td className="text-right">
                            {typeof pos.value === 'number'
                              ? formatCurrency(pos.value)
                              : pos.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

StatementDetailPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Details | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default StatementDetailPage;
