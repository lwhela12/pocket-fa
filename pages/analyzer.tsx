import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Modal from '../components/layout/Modal';
import AssetForm from '../components/dashboard/AssetForm';
import DebtForm from '../components/dashboard/DebtForm';
import StatementUploadModal from '../components/dashboard/StatementUploadModal';
import ReviewButton from '../components/dashboard/ReviewButton';
import { NextPageWithLayout } from './_app';
import { fetchApi } from '../lib/api-utils';

type Asset = {
  id?: string;
  type: string;
  subtype?: string | null;
  name: string;
  balance: number;
  interestRate?: number | null;
  annualContribution?: number | null;
  growthRate?: number | null;
  assetClass?: string | null;
};

type Debt = {
  id?: string;
  type: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termLength?: number | null;
};

type RecordItem = { recordType: 'asset' | 'debt'; data: Asset | Debt };

type ParsedRecord = {
  recordType: 'asset' | 'debt';
  asset?: Asset;
  debt?: Debt;
};

const Analyzer: NextPageWithLayout = () => {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<'asset' | 'debt' | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [queue, setQueue] = useState<ParsedRecord[]>([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [assetRes, debtRes] = await Promise.all([
        fetchApi<Asset[]>('/api/dashboard/assets'),
        fetchApi<Debt[]>('/api/dashboard/debts'),
      ]);
      const items: RecordItem[] = [];
      if (assetRes.success && assetRes.data) {
        assetRes.data.forEach((a) => items.push({ recordType: 'asset', data: a }));
      }
      if (debtRes.success && debtRes.data) {
        debtRes.data.forEach((d) => items.push({ recordType: 'debt', data: d }));
      }
      setRecords(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const openNextFromQueue = () => {
    const next = queue[0];
    if (!next) return;
    setQueue(queue.slice(1));
    if (next.recordType === 'asset' && next.asset) {
      setFormType('asset');
      setEditing(next.asset);
      setFormOpen(true);
    } else if (next.recordType === 'debt' && next.debt) {
      setFormType('debt');
      setEditing(next.debt);
      setFormOpen(true);
    }
  };

  const handleParsed = (data: ParsedRecord[]) => {
    if (Array.isArray(data)) {
      setQueue(data);
      openNextFromQueue();
    }
  };

  const handleAddRecord = async (payload: any) => {
    if (!formType) return;
    const url = formType === 'asset' ? '/api/dashboard/assets' : '/api/dashboard/debts';
    const res = await fetchApi(url, { method: 'POST', body: JSON.stringify(payload) });
    if (res.success) {
      setFormOpen(false);
      setEditing(null);
      await fetchRecords();
      openNextFromQueue();
    } else {
      setError(res.error || 'Failed to save record');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Statement Analyzer</h1>
        <button className="btn btn-primary" onClick={() => setUploadOpen(true)}>
          Upload Statement
        </button>
      </div>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {records.map((item) => (
            <div key={(item.data as any).id} className="rounded-md bg-white p-4 shadow">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.recordType === 'asset' ? (item.data as Asset).name : (item.data as Debt).lender}
                  </p>
                  <p className="text-sm text-gray-500">
                    {item.recordType} - {(item.data as any).type}
                  </p>
                </div>
                <div className="text-right space-x-2">
                  <span className="text-sm text-gray-700">{formatCurrency((item.data as any).balance)}</span>
                  <ReviewButton recordType={item.recordType} record={item.data} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Statement">
        <StatementUploadModal onClose={() => setUploadOpen(false)} onParsed={handleParsed} />
      </Modal>
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Confirm Data">
        {formType === 'asset' && (
          <AssetForm onSubmit={handleAddRecord} onCancel={() => setFormOpen(false)} initialValues={editing} isSubmitting={false} />
        )}
        {formType === 'debt' && (
          <DebtForm onSubmit={handleAddRecord} onCancel={() => setFormOpen(false)} initialValues={editing} isSubmitting={false} />
        )}
      </Modal>
    </>
  );
};

Analyzer.getLayout = (page: React.ReactElement) => (
  <DashboardLayout title="Statement Analyzer | Pocket Financial Advisor">{page}</DashboardLayout>
);

export default Analyzer;
