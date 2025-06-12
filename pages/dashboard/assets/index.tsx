// @ts-nocheck
import { ReactElement, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Modal from '../../../components/layout/Modal';
import AssetForm from '../../../components/dashboard/AssetForm';
import DebtForm from '../../../components/dashboard/DebtForm';
import StatementUploadModal, { ParsedStatement } from '../../../components/dashboard/StatementUploadModal';
import ReviewButton from '../../../components/dashboard/ReviewButton';
import { NextPageWithLayout } from '../../_app';
import { useAuth } from '../../../hooks/useAuth';
import { fetchApi } from '../../../lib/api-utils';

type Asset = {
  id: string;
  type: string;
  subtype: string | null;
  name: string;
  balance: number;
  interestRate: number | null;
  annualContribution: number | null;
  growthRate: number | null;
  assetClass: string | null;
};

const Assets: NextPageWithLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingDebt, setEditingDebt] = useState<any | null>(null);
  const [modalType, setModalType] = useState<'asset' | 'debt'>('asset');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [parsedAsset, setParsedAsset] = useState<any | null>(null);
  const [parsedDebt, setParsedDebt] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);
  
  // Fetch assets when component mounts
  useEffect(() => {
    if (user) {
      fetchAssets();
    }
  }, [user]);
  
  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi('/api/dashboard/assets');
      
      if (response.success) {
        setAssets(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddAsset = async (asset: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/assets', {
        method: 'POST',
        body: JSON.stringify(asset),
      });
      
      if (response.success) {
        setAssets([response.data, ...assets]);
        setIsModalOpen(false);
      } else {
        setError(response.error || 'Failed to add asset');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDebtFromStatement = async (debt: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/debts', {
        method: 'POST',
        body: JSON.stringify(debt),
      });
      if (!response.success) {
        setError(response.error || 'Failed to add debt');
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setParsedDebt(null);
    }
  };
  
  const handleEditAsset = async (asset: any) => {
    if (!editingAsset) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/assets?id=${editingAsset.id}`, {
        method: 'PUT',
        body: JSON.stringify(asset),
      });
      
      if (response.success) {
        setAssets(assets.map(a => a.id === editingAsset.id ? response.data : a));
        setIsModalOpen(false);
        setEditingAsset(null);
      } else {
        setError(response.error || 'Failed to update asset');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/assets?id=${assetToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setAssets(assets.filter(a => a.id !== assetToDelete.id));
        setIsDeleteModalOpen(false);
        setAssetToDelete(null);
      } else {
        setError(response.error || 'Failed to delete asset');
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

  const handleParsedStatement = (data: ParsedStatement[]) => {
    const first = data[0];
    if (!first) return;
    if (first.recordType === 'asset' && first.asset) {
      setModalType('asset');
      setParsedAsset(first.asset);
      setEditingAsset(null);
      setIsModalOpen(true);
    } else if (first.recordType === 'debt' && first.debt) {
      setModalType('debt');
      setParsedDebt(first.debt);
      setEditingDebt(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Your Assets</h1>
          <p className="mt-1 text-gray-600">Manage and track your assets</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Statement
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setModalType('asset');
              setEditingAsset(null);
              setParsedAsset(null);
              setIsModalOpen(true);
            }}
          >
            Add New Asset
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
          <p className="mt-2 text-gray-500">Loading your assets...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Assets Summary</h3>
              <div className="mt-2 flex justify-between border-b border-gray-200 pb-5">
                <div>
                  <p className="text-sm text-gray-500">Total Cash</p>
                  <p className="text-2xl font-medium text-gray-900">
                    {formatCurrency(
                      assets
                        .filter(asset => asset.type === 'Cash')
                        .reduce((sum, asset) => sum + asset.balance, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Investments</p>
                  <p className="text-2xl font-medium text-gray-900">
                    {formatCurrency(
                      assets
                        .filter(asset => asset.type === 'Investment')
                        .reduce((sum, asset) => sum + asset.balance, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-medium text-gray-900">
                    {formatCurrency(
                      assets.reduce((sum, asset) => sum + asset.balance, 0)
                    )}
                  </p>
                </div>
              </div>
              
              {/* Cash Assets */}
              {assets.filter(asset => asset.type === 'Cash').length > 0 && (
                <div className="mt-4">
                  <h4 className="text-base font-medium text-gray-900">Cash Assets</h4>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Interest Rate</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {assets.filter(asset => asset.type === 'Cash').map(asset => (
                          <tr key={asset.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{asset.name}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.subtype}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.interestRate}%</td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(asset.balance)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                              <button 
                                className="text-primary hover:text-blue-900"
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <span className="mx-2 text-gray-300">|</span>
                              <ReviewButton recordType="asset" record={asset} />
                              <span className="mx-2 text-gray-300">|</span>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  setAssetToDelete(asset);
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
              )}
              
              {/* Investment Assets */}
              {assets.filter(asset => asset.type === 'Investment').length > 0 && (
                <div className="mt-8">
                  <h4 className="text-base font-medium text-gray-900">Investment Assets</h4>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asset Class</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Growth Rate</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Annual Contribution</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Balance</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {assets.filter(asset => asset.type === 'Investment').map(asset => (
                          <tr key={asset.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{asset.name}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.subtype}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.assetClass}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.growthRate}%</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{asset.annualContribution ? formatCurrency(asset.annualContribution) : '-'}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(asset.balance)}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                              <button
                                className="text-primary hover:text-blue-900"
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <span className="mx-2 text-gray-300">|</span>
                              <ReviewButton recordType="asset" record={asset} />
                              <span className="mx-2 text-gray-300">|</span>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => {
                                  setAssetToDelete(asset);
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
              )}

              {/* No assets message */}
              {assets.length === 0 && (
                <div className="mt-4 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        You don't have any assets yet. Click the "Add New Asset" button to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Add/Edit Modal (Asset or Debt) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAsset(null);
          setEditingDebt(null);
          setParsedAsset(null);
          setParsedDebt(null);
        }}
        title={modalType === 'asset' ? (editingAsset ? 'Edit Asset' : 'Add New Asset') : 'Add New Debt'}
        maxWidth="max-w-2xl"
      >
        {modalType === 'asset' ? (
          <AssetForm
            onSubmit={editingAsset ? handleEditAsset : handleAddAsset}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingAsset(null);
              setParsedAsset(null);
            }}
            initialValues={parsedAsset || editingAsset}
            isSubmitting={isSubmitting}
          />
        ) : (
          <DebtForm
            onSubmit={handleAddDebtFromStatement}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingDebt(null);
              setParsedDebt(null);
            }}
            initialValues={parsedDebt || editingDebt}
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
          setAssetToDelete(null);
        }}
        title="Delete Asset"
      >
        <div className="text-center sm:text-left">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this asset? This action cannot be undone.
          </p>
          
          {assetToDelete && (
            <div className="mt-4 rounded-md bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{assetToDelete.name}</p>
              <p className="text-gray-500">{formatCurrency(assetToDelete.balance)}</p>
            </div>
          )}
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeleteAsset}
              disabled={isSubmitting}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setAssetToDelete(null);
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

Assets.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout title="Assets | Pocket Financial Advisor">{page}</DashboardLayout>;
};

export default Assets;