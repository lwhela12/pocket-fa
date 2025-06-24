import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { fetchApi } from '../../../lib/api-utils';
import { Statement } from '@prisma/client';
import { NextPageWithLayout } from '../../_app';

const StatementDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [statement, setStatement] = useState<Statement | null>(null);

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    (async () => {
      const res = await fetchApi<Statement>(`/api/statements/${id}`);
      if (res.success && res.data) setStatement(res.data);
    })();
  }, [id]);

  if (!statement) return <p>Loading...</p>;

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
            <div key={idx} className="rounded-md border p-4">
              <h3 className="mb-2 font-semibold">Account {acc.name || idx + 1}</h3>
              <pre className="whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(acc, null, 2)}
              </pre>
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
