import { ReactElement, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Modal from '../../../components/layout/Modal';
import ExpenseForm from '../../../components/dashboard/ExpenseForm';
import { NextPageWithLayout } from '../../_app';
import { useAuth } from '../../../hooks/useAuth';
import { fetchApi } from '../../../lib/api-utils';

type ExpenseRecord = {
  id: string;
  month: Date;
  isDetailed: boolean;
  totalMonthly: number | null;
  housing: number | null;
  utilities: number | null;
  groceries: number | null;
  dining: number | null;
  transport: number | null;
  healthcare: number | null;
  entertainment: number | null;
  miscellaneous: number | null;
};

const CATEGORY_ICONS: Record<string, string> = {
  housing: '🏠',
  utilities: '⚡',
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚗',
  healthcare: '🏥',
  entertainment: '🎭',
  miscellaneous: '💰',
};

const CATEGORY_COLORS: Record<string, string> = {
  housing: '#3B82F6',
  utilities: '#F59E0B',
  groceries: '#10B981',
  dining: '#EF4444',
  transport: '#8B5CF6',
  healthcare: '#EC4899',
  entertainment: '#14B8A6',
  miscellaneous: '#6B7280',
};

const Expenses: NextPageWithLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentRecord, setCurrentRecord] = useState<ExpenseRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, currentMonth]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi('/api/dashboard/expenses');

      if (response.success) {
        const data = (response.data as any[]).map((r: any) => ({
          ...r,
          month: new Date(r.month),
        }));
        setRecords(data);

        // Find current month record
        const monthKey = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const found = data.find(
          (r: ExpenseRecord) => r.month.getTime() === monthKey.getTime()
        );
        setCurrentRecord(found || null);
      } else {
        setError(response.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExpenses = async (data: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success) {
        await fetchExpenses();
        setIsModalOpen(false);
      } else {
        setError(response.error || 'Failed to save expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadFile(base64);
      setUploadFilename(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleBankUpload = async () => {
    if (!uploadFile || !uploadFilename) return;

    try {
      setIsUploading(true);
      const response = await fetchApi('/api/expenses/bank-upload', {
        method: 'POST',
        body: JSON.stringify({
          file: uploadFile,
          filename: uploadFilename,
        }),
      });

      if (response.success) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadFilename('');
        setTimeout(() => fetchExpenses(), 2000); // Refresh after processing
      } else {
        setError(response.error || 'Failed to upload bank statement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryBreakdown = () => {
    if (!currentRecord || !currentRecord.isDetailed) return [];

    return [
      { name: 'Housing', key: 'housing', amount: currentRecord.housing },
      { name: 'Utilities', key: 'utilities', amount: currentRecord.utilities },
      { name: 'Groceries', key: 'groceries', amount: currentRecord.groceries },
      { name: 'Dining', key: 'dining', amount: currentRecord.dining },
      { name: 'Transport', key: 'transport', amount: currentRecord.transport },
      { name: 'Healthcare', key: 'healthcare', amount: currentRecord.healthcare },
      { name: 'Entertainment', key: 'entertainment', amount: currentRecord.entertainment },
      { name: 'Miscellaneous', key: 'miscellaneous', amount: currentRecord.miscellaneous },
    ].filter((cat) => cat.amount && cat.amount > 0);
  };

  const getLargestCategory = () => {
    const breakdown = getCategoryBreakdown();
    if (breakdown.length === 0) return null;
    return breakdown.reduce((max, cat) => (cat.amount! > max.amount! ? cat : max));
  };

  const getSavingsRate = () => {
    // TODO: Get income from profile
    const monthlyIncome = 8000; // Placeholder
    const expenses = currentRecord?.totalMonthly || 0;
    return ((monthlyIncome - expenses) / monthlyIncome) * 100;
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const totalExpenses = currentRecord?.totalMonthly || 0;
  const largestCategory = getLargestCategory();
  const savingsRate = getSavingsRate();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
          <p className="mt-1 text-gray-600">Track and manage your monthly expenses</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Bank Statement
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            Add Expenses
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="mb-6 flex items-center justify-center space-x-4">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-2xl font-semibold text-gray-900">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-full p-2 hover:bg-gray-100"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-gray-500">Loading expenses...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Monthly Expenses</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(totalExpenses)}
              </p>
            </div>

            {largestCategory && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                <h3 className="text-sm font-medium text-gray-500">Largest Category</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {CATEGORY_ICONS[largestCategory.key]} {largestCategory.name}
                </p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(largestCategory.amount!)}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-500">Savings Rate</h3>
              <p
                className={`mt-2 text-3xl font-bold ${
                  savingsRate > 20
                    ? 'text-green-600'
                    : savingsRate > 10
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {savingsRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                {savingsRate > 20 ? 'Excellent!' : savingsRate > 10 ? 'Good' : 'Room to improve'}
              </p>
            </div>
          </div>

          {/* Category Breakdown */}
          {currentRecord?.isDetailed && getCategoryBreakdown().length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Monthly Expense Breakdown
              </h3>
              <div className="space-y-3">
                {getCategoryBreakdown().map((category) => {
                  const percentage = (category.amount! / totalExpenses) * 100;
                  return (
                    <div key={category.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {CATEGORY_ICONS[category.key]} {category.name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(category.amount!)} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: CATEGORY_COLORS[category.key],
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No data message */}
          {!currentRecord && (
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                No expenses recorded for this month. Click "Add Expenses" to get started.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchExpenses(); // Refresh data when modal closes
        }}
        title="Manage Expenses"
        maxWidth="max-w-2xl"
      >
        <ExpenseForm
          onSubmit={handleSubmitExpenses}
          onCancel={() => {
            setIsModalOpen(false);
            fetchExpenses(); // Refresh data when cancelled
          }}
          initialValues={currentRecord}
          isSubmitting={isSubmitting}
          month={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)}
        />
      </Modal>

      {/* Bank Statement Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFile(null);
          setUploadFilename('');
        }}
        title="Upload Bank Statement"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV or PDF bank statement to automatically categorize your expenses.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadFilename && (
              <p className="mt-2 text-sm text-gray-600">Selected: {uploadFilename}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFile(null);
                setUploadFilename('');
              }}
              className="btn"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleBankUpload}
              className="btn btn-primary"
              disabled={!uploadFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload & Analyze'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

Expenses.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardLayout title="Expenses | Pocket Financial Advisor">{page}</DashboardLayout>
  );
};

export default Expenses;
