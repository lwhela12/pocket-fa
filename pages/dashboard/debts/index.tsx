import { ReactElement, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Modal from '../../../components/layout/Modal';
import DebtForm from '../../../components/dashboard/DebtForm';
import AssetForm from '../../../components/dashboard/AssetForm';
import StatementUploadModal, { ParsedStatement } from '../../../components/dashboard/StatementUploadModal';
import { NextPageWithLayout } from '../../_app';
import { useAuth } from '../../../hooks/useAuth';
import { fetchApi } from '../../../lib/api-utils';

type Debt = {
  id: string;
  type: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termLength: number | null;
};

const Debts: NextPageWithLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'debt' | 'asset'>('debt');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [parsedDebt, setParsedDebt] = useState<any | null>(null);
  const [parsedAsset, setParsedAsset] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);
  
  // Fetch debts when component mounts
  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);
  
  const fetchDebts = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi('/api/dashboard/debts');
      
      if (response.success) {
        setDebts(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch debts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddDebt = async (debt: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/debts', {
        method: 'POST',
        body: JSON.stringify(debt),
      });
      
      if (response.success) {
        setDebts([response.data, ...debts]);
        setIsModalOpen(false);
      } else {
        setError(response.error || 'Failed to add debt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAssetFromStatement = async (asset: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/assets', {
        method: 'POST',
        body: JSON.stringify(asset),
      });
      if (!response.success) {
        setError(response.error || 'Failed to add asset');
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setParsedAsset(null);
    }
  };
  
  const handleEditDebt = async (debt: any) => {
    if (!editingDebt) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/debts?id=${editingDebt.id}`, {
        method: 'PUT',
        body: JSON.stringify(debt),
      });
      
      if (response.success) {
        setDebts(debts.map(d => d.id === editingDebt.id ? response.data : d));
        setIsModalOpen(false);
        setEditingDebt(null);
      } else {
        setError(response.error || 'Failed to update debt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteDebt = async () => {
    if (!debtToDelete) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/debts?id=${debtToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setDebts(debts.filter(d => d.id !== debtToDelete.id));
        setIsDeleteModalOpen(false);
        setDebtToDelete(null);
      } else {
        setError(response.error || 'Failed to delete debt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateTotalMonthlyPayment = () => {
    return debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  };

  const getDebtToIncomeRatio = () => {
    // Assuming a monthly income of $8,000 for this example
    // In a real app, this would come from the user's profile
    const monthlyIncome = 8000;
    const totalMonthlyPayment = calculateTotalMonthlyPayment();
    return (totalMonthlyPayment / monthlyIncome) * 100;
  };

  const handleParsedStatement = (data: ParsedStatement) => {
    if (data.recordType === 'debt' && data.debt) {
      setModalType('debt');
      setParsedDebt(data.debt);
      setEditingDebt(null);
      setIsModalOpen(true);
    } else if (data.recordType === 'asset' && data.asset) {
      setModalType('asset');
      setParsedAsset(data.asset);
      setEditingAsset(null);
      setIsModalOpen(true);
    }
  };

  // Show loading spinner while checking authentication
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
      <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Debts</h1>
          <p className="mt-1 text-gray-600">Manage and track your debts</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setIsUploadModalOpen(true)}>
            Upload Statement
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setModalType('debt');
              setEditingDebt(null);
              setParsedDebt(null);
              setIsModalOpen(true);
            }}
          >
            Add New Debt
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-500">Loading your debts...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {debts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                  <h3 className="text-lg font-medium text-gray-900">Total Debt</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(debts.reduce((sum, debt) => sum + debt.balance, 0))}
                  </p>
                </div>
                
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                  <h3 className="text-lg font-medium text-gray-900">Monthly Payments</h3>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(calculateTotalMonthlyPayment())}
                  </p>
                </div>
                
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
                  <h3 className="text-lg font-medium text-gray-900">Debt-to-Income Ratio</h3>
                  <p className={`mt-2 text-3xl font-bold ${
                    getDebtToIncomeRatio() > 36 ? 'text-red-600' : 
                    getDebtToIncomeRatio() > 28 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {getDebtToIncomeRatio().toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {getDebtToIncomeRatio() > 36 ? 'High risk - consider debt reduction' : 
                     getDebtToIncomeRatio() > 28 ? 'Moderate risk - watch your spending' : 'Healthy ratio - well done!'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Debts List</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Lender</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Interest Rate</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Monthly Payment</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Remaining Term</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {debts.map(debt => (
                          <tr key={debt.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{debt.lender}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{debt.type}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{debt.interestRate}%</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{formatCurrency(debt.monthlyPayment)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {debt.termLength ? `${(debt.termLength / 12).toFixed(1)} years` : 'Revolving'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(debt.balance)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                              <button 
                                className="text-primary hover:text-blue-900"
                                onClick={() => {
                                  setEditingDebt(debt);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <span className="mx-2 text-gray-300">|</span>
                              <button 
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  setDebtToDelete(debt);
                                  setIsDeleteModalOpen(true);
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
                <h3 className="text-lg font-medium text-gray-900">Debt Payoff Strategies</h3>
                <div className="mt-4 space-y-4">
                  {debts.length > 0 && (
                    <>
                      <div className="rounded-lg bg-blue-50 p-4">
                        <h4 className="text-md font-medium text-blue-800">Avalanche Method</h4>
                        <p className="mt-1 text-sm text-blue-700">
                          Pay minimum payments on all debts, then use extra money to pay off the highest interest rate debt first. 
                          This minimizes the total interest paid.
                        </p>
                        <p className="mt-2 text-sm font-medium text-blue-800">
                          Recommended first debt to focus on: {
                            debts.reduce((highest, debt) => highest.interestRate > debt.interestRate ? highest : debt, debts[0]).lender
                          } ({
                            debts.reduce((highest, debt) => highest.interestRate > debt.interestRate ? highest : debt, debts[0]).interestRate
                          }%)
                        </p>
                      </div>
                      
                      <div className="rounded-lg bg-green-50 p-4">
                        <h4 className="text-md font-medium text-green-800">Snowball Method</h4>
                        <p className="mt-1 text-sm text-green-700">
                          Pay minimum payments on all debts, then use extra money to pay off the smallest balance first. 
                          This creates psychological wins and momentum.
                        </p>
                        <p className="mt-2 text-sm font-medium text-green-800">
                          Recommended first debt to focus on: {
                            debts.reduce((smallest, debt) => smallest.balance < debt.balance ? smallest : debt, debts[0]).lender
                          } ({
                            formatCurrency(
                              debts.reduce((smallest, debt) => smallest.balance < debt.balance ? smallest : debt, debts[0]).balance
                            )
                          })
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    You don't have any debts yet. Click the "Add New Debt" button to add a debt.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Add/Edit Modal (Debt or Asset) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDebt(null);
          setEditingAsset(null);
          setParsedAsset(null);
          setParsedDebt(null);
        }}
        title={modalType === 'debt' ? (editingDebt ? 'Edit Debt' : 'Add New Debt') : 'Add New Asset'}
        maxWidth="max-w-2xl"
      >
        {modalType === 'debt' ? (
          <DebtForm
            onSubmit={editingDebt ? handleEditDebt : handleAddDebt}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingDebt(null);
              setParsedDebt(null);
            }}
            initialValues={parsedDebt || editingDebt}
            isSubmitting={isSubmitting}
          />
        ) : (
          <AssetForm
            onSubmit={handleAddAssetFromStatement}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingAsset(null);
              setParsedAsset(null);
            }}
            initialValues={parsedAsset || editingAsset}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>

      {/* Statement Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Statement"
      >
        <StatementUploadModal
          onClose={() => setIsUploadModalOpen(false)}
          onParsed={handleParsedStatement}
        />
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDebtToDelete(null);
        }}
        title="Delete Debt"
      >
        <div className="text-center sm:text-left">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this debt? This action cannot be undone.
          </p>
          
          {debtToDelete && (
            <div className="mt-4 rounded-md bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{debtToDelete.lender} - {debtToDelete.type}</p>
              <p className="text-gray-500">{formatCurrency(debtToDelete.balance)}</p>
            </div>
          )}
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeleteDebt}
              disabled={isSubmitting}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDebtToDelete(null);
              }}
              disabled={isSubmitting}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

Debts.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout title="Debts | Pocket Financial Advisor">{page}</DashboardLayout>;
};

export default Debts;