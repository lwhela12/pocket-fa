// @ts-nocheck
import { ReactElement, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Modal from '../../../components/layout/Modal';
import GoalForm from '../../../components/dashboard/GoalForm';
import { NextPageWithLayout } from '../../_app';
import { useAuth } from '../../../hooks/useAuth';
import { fetchApi } from '../../../lib/api-utils';
import { calculateGoalSuccess, projectAssetValue } from '../../../utils/tvm';

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  isActive: boolean;
  priority: number;
};

type Asset = {
  id: string;
  type: string;
  subtype: string | null;
  balance: number;
  growthRate: number | null;
  interestRate: number | null;
  annualContribution: number | null;
};

const Goals: NextPageWithLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  
  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);
  
  // Fetch goals when component mounts
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [goalsRes, assetsRes] = await Promise.all([
        fetchApi('/api/dashboard/goals'),
        fetchApi('/api/dashboard/assets'),
      ]);

      if (goalsRes.success) {
        setGoals((goalsRes.data || []).map((goal: any) => ({
          ...goal,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        })));
      } else {
        setError(goalsRes.error || 'Failed to fetch goals');
      }

      if (assetsRes.success) {
        setAssets(assetsRes.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddGoal = async (goal: any) => {
    try {
      setIsSubmitting(true);
      const response = await fetchApi('/api/dashboard/goals', {
        method: 'POST',
        body: JSON.stringify(goal),
      });
      
      if (response.success) {
        setGoals([
          {
            ...response.data,
            targetDate: response.data.targetDate ? new Date(response.data.targetDate) : null,
          },
          ...goals,
        ]);
        setIsModalOpen(false);
      } else {
        setError(response.error || 'Failed to add goal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditGoal = async (goal: any) => {
    if (!editingGoal) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/goals?id=${editingGoal.id}`, {
        method: 'PUT',
        body: JSON.stringify(goal),
      });
      
      if (response.success) {
        setGoals(goals.map(g => g.id === editingGoal.id ? {
          ...response.data,
          targetDate: response.data.targetDate ? new Date(response.data.targetDate) : null,
        } : g));
        setIsModalOpen(false);
        setEditingGoal(null);
      } else {
        setError(response.error || 'Failed to update goal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    
    try {
      setIsSubmitting(true);
      const response = await fetchApi(`/api/dashboard/goals?id=${goalToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        setGoals(goals.filter(g => g.id !== goalToDelete.id));
        setIsDeleteModalOpen(false);
        setGoalToDelete(null);
      } else {
        setError(response.error || 'Failed to delete goal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddContribution = async () => {
    if (!contributionGoal || !contributionAmount) return;
    
    try {
      setIsSubmitting(true);
      
      const amount = parseFloat(contributionAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid contribution amount');
        return;
      }
      
      const newAmount = contributionGoal.currentAmount + amount;
      
      const response = await fetchApi(`/api/dashboard/goals?id=${contributionGoal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          currentAmount: newAmount,
        }),
      });
      
      if (response.success) {
        setGoals(goals.map(g => g.id === contributionGoal.id ? {
          ...response.data,
          targetDate: response.data.targetDate ? new Date(response.data.targetDate) : null,
        } : g));
        setContributionModalOpen(false);
        setContributionGoal(null);
        setContributionAmount('');
      } else {
        setError(response.error || 'Failed to add contribution');
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateProgress = (currentAmount: number, targetAmount: number) => {
    return (currentAmount / targetAmount) * 100;
  };

  const calculateMonthsRemaining = (targetDate: Date | null) => {
    if (!targetDate) return null;
    
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.5));
    return diffMonths;
  };

  const calculateRequiredMonthlySavings = (goal: Goal) => {
    if (!goal.targetDate) return null;
    
    const monthsRemaining = calculateMonthsRemaining(goal.targetDate);
    if (!monthsRemaining || monthsRemaining <= 0) return null;
    
    const amountNeeded = goal.targetAmount - goal.currentAmount;
    return amountNeeded / monthsRemaining;
  };
  
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: 'High', color: 'text-red-600 bg-red-100' };
      case 2:
        return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
      case 3:
        return { label: 'Low', color: 'text-green-600 bg-green-100' };
      default:
        return { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
    }
  };

  const isRetirementAsset = (asset: Asset) => {
    const subtype = asset.subtype?.toLowerCase() || '';
    return subtype.includes('ira') || subtype.includes('401');
  };

  const calculateSuccessPercentage = (goal: Goal) => {
    if (!goal.targetDate) return 0;
    const years = Math.max(0, (goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25));
    const relevantAssets = goal.name.toLowerCase().includes('retirement')
      ? assets.filter(isRetirementAsset)
      : assets.filter(a => !isRetirementAsset(a));
    const projected = relevantAssets.map(a => ({
      balance: a.balance,
      growthRate: a.growthRate,
      interestRate: a.interestRate,
      annualContribution: a.annualContribution,
    }));
    return calculateGoalSuccess(goal.targetAmount, years, projected);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
          <p className="mt-1 text-gray-600">Track and manage your financial goals</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setEditingGoal(null);
            setIsModalOpen(true);
          }}
        >
          Add New Goal
        </button>
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
          <p className="mt-2 text-gray-500">Loading your goals...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {goals.length > 0 ? (
            <>
              {goals.map(goal => {
                const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                const monthsRemaining = goal.targetDate ? calculateMonthsRemaining(goal.targetDate) : null;
                const monthlySavings = goal.targetDate ? calculateRequiredMonthlySavings(goal) : null;
                const priorityStyle = getPriorityLabel(goal.priority);
                const successPct = calculateSuccessPercentage(goal);
                const statusLabel = successPct >= 100 ? 'On Track' : 'Off Track';
                
                return (
                  <div key={goal.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between">
                        <div className="mb-4 md:mb-0">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900">{goal.name}</h3>
                            <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityStyle.color}`}>
                              {priorityStyle.label} Priority
                            </span>
                            {!goal.isActive && (
                              <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {goal.targetDate 
                              ? `Target date: ${formatDate(goal.targetDate)}`
                              : 'No target date set'}
                          </p>
                        </div>
                        
                        <div className="flex space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-500">Current</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(goal.currentAmount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-500">Target</p>
                            <p className="text-lg font-semibold text-gray-900">{formatCurrency(goal.targetAmount)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{progress.toFixed(1)}% complete</span>
                          <span className="text-gray-500">{formatCurrency(goal.targetAmount - goal.currentAmount)} remaining</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                          <div 
                            className={`h-2 rounded-full ${
                              progress < 25 ? 'bg-red-500' :
                              progress < 50 ? 'bg-yellow-500' :
                              progress < 75 ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap justify-between border-t border-gray-200 pt-4">
                        {monthlySavings !== null && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Monthly Contribution Needed</p>
                            <p className="text-lg font-medium text-primary">{formatCurrency(monthlySavings)}</p>
                          </div>
                        )}
                        
                        {monthsRemaining !== null && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Time Remaining</p>
                            <p className="text-lg font-medium text-gray-900">
                              {monthsRemaining <= 0
                                ? 'Past due'
                                : monthsRemaining < 12
                                  ? `${monthsRemaining} months`
                                  : `${(monthsRemaining / 12).toFixed(1)} years`}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <p className={`text-lg font-medium ${successPct >= 100 ? 'text-green-600' : 'text-red-600'}`}>{statusLabel} ({successPct.toFixed(0)}%)</p>
                        </div>
                        
                        <div className="mt-4 flex w-full space-x-2 sm:mt-0 sm:w-auto">
                          <button 
                            className="btn bg-white px-4 py-2 text-sm text-primary ring-1 ring-primary hover:bg-gray-50"
                            onClick={() => {
                              setEditingGoal(goal);
                              setIsModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn bg-primary px-4 py-2 text-sm text-white hover:bg-blue-600"
                            onClick={() => {
                              setContributionGoal(goal);
                              setContributionAmount('');
                              setContributionModalOpen(true);
                            }}
                          >
                            Add Contribution
                          </button>
                          <button 
                            className="btn bg-white px-4 py-2 text-sm text-red-600 ring-1 ring-red-600 hover:bg-red-50"
                            onClick={() => {
                              setGoalToDelete(goal);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    You don't have any financial goals yet. Click the "Add New Goal" button to create your first goal.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Goal Recommendations</h3>
              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="text-md font-medium text-blue-800">Emergency Fund</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    It's recommended to have 3-6 months of expenses saved in an easily accessible account. 
                    Based on your current expenses, aim for $25,000-$50,000.
                  </p>
                </div>
                
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="text-md font-medium text-green-800">Retirement Savings</h4>
                  <p className="mt-1 text-sm text-green-700">
                    For a comfortable retirement, aim to save 15% of your pre-tax income. 
                    Consider maxing out your 401(k) and Roth IRA contributions each year.
                  </p>
                </div>
                
                <div className="rounded-lg bg-yellow-50 p-4">
                  <h4 className="text-md font-medium text-yellow-800">Debt Payoff</h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Consider creating a goal to pay off your high-interest debt (like credit cards) 
                    before focusing heavily on other financial goals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Add/Edit Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        title={editingGoal ? 'Edit Goal' : 'Add New Goal'}
        maxWidth="max-w-2xl"
      >
        <GoalForm
          onSubmit={editingGoal ? handleEditGoal : handleAddGoal}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingGoal(null);
          }}
          initialValues={editingGoal}
          isSubmitting={isSubmitting}
        />
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setGoalToDelete(null);
        }}
        title="Delete Goal"
      >
        <div className="text-center sm:text-left">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this goal? This action cannot be undone.
          </p>
          
          {goalToDelete && (
            <div className="mt-4 rounded-md bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{goalToDelete.name}</p>
              <p className="text-gray-500">Progress: {formatCurrency(goalToDelete.currentAmount)} / {formatCurrency(goalToDelete.targetAmount)}</p>
            </div>
          )}
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeleteGoal}
              disabled={isSubmitting}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setGoalToDelete(null);
              }}
              disabled={isSubmitting}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Add Contribution Modal */}
      <Modal
        isOpen={contributionModalOpen}
        onClose={() => {
          setContributionModalOpen(false);
          setContributionGoal(null);
          setContributionAmount('');
        }}
        title="Add Contribution"
      >
        <div>
          {contributionGoal && (
            <div className="mb-4">
              <p className="text-sm text-gray-500">Add a contribution to your goal:</p>
              <p className="mt-1 font-medium text-gray-900">{contributionGoal.name}</p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div 
                  className={`h-2 rounded-full ${
                    calculateProgress(contributionGoal.currentAmount, contributionGoal.targetAmount) < 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${calculateProgress(contributionGoal.currentAmount, contributionGoal.targetAmount)}%` }}
                ></div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Current: {formatCurrency(contributionGoal.currentAmount)}</span>
                <span>Target: {formatCurrency(contributionGoal.targetAmount)}</span>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Contribution Amount</label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                value={contributionAmount}
                onChange={e => setContributionAmount(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleAddContribution}
              disabled={isSubmitting || !contributionAmount}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {isSubmitting ? 'Adding...' : 'Add Contribution'}
            </button>
            <button
              type="button"
              onClick={() => {
                setContributionModalOpen(false);
                setContributionGoal(null);
                setContributionAmount('');
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

Goals.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout title="Financial Goals | Pocket Financial Advisor">{page}</DashboardLayout>;
};

export default Goals;