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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{statement.fileName}</h1>
      <pre className="whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-md text-sm">
        {JSON.stringify(statement.parsedData, null, 2)}
      </pre>
    </div>
  );
};

StatementDetailPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Details | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default StatementDetailPage;
