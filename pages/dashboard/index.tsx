import { ReactElement, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NetWorthCard from '../../components/dashboard/NetWorthCard';
import AssetAllocationCard from '../../components/dashboard/AssetAllocationCard';
import FinancialProjectionsCard from '../../components/dashboard/FinancialProjectionsCard';
import ProgressChart from '../../components/dashboard/ProgressChart';
import ChatInterface from '../../components/dashboard/ChatInterface';
import { NextPageWithLayout } from '../_app';
import { useAuth } from '../../hooks/useAuth';
import { fetchApi } from '../../lib/api-utils';
import type { DashboardResponse } from '../api/dashboard/overview';
import Modal from '../../components/layout/Modal';

// Goal type for user financial goals
type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  isActive: boolean;
  priority: number;
};

// Asset class colors for the chart
const assetClassColors = {
  'Cash': '#4CAF50',
  'Stocks': '#2196F3',
  'Bonds': '#FFC107',
  'ETFs': '#9C27B0',
  'Mutual Funds': '#FF5722',
  'Real Estate': '#607D8B',
  'Cash Equivalents': '#00BCD4',
  'Other': '#795548',
  // Add fallback for unknown asset classes
  'Unknown': '#9E9E9E'
};

const Dashboard: NextPageWithLayout = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardOverview();
    }
  }, [user]);

  const fetchDashboardOverview = async () => {
    try {
      setIsLoading(true);
      const [overviewResponse, goalsResponse] = await Promise.all([
        fetchApi<DashboardResponse>('/api/dashboard/overview'),
        fetchApi('/api/dashboard/goals'),
      ]);

      if (!overviewResponse.success) {
        setError(overviewResponse.error || 'Failed to load dashboard data');
      } else {
        setDashboardData(overviewResponse.data!);
      }

      if (goalsResponse.success) {
        setGoals(
          goalsResponse.data.map((goal: any) => ({
            ...goal,
            targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
          }))
        );
        if (goalsResponse.data.length === 0) {
          setShowWizard(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking authentication
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getHighestPriorityGoal = () => {
    const activeGoals = goals.filter(goal => goal.isActive);
    if (activeGoals.length === 0) {
      return null;
    }
    return activeGoals.sort((a, b) => a.priority - b.priority)[0];
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Get dashboard data
  const netWorth = dashboardData?.netWorth ?? 0;
  const totalAssets = dashboardData?.assets ?? 0;
  const totalDebts = dashboardData?.debts ?? 0;
  const assetCount = dashboardData?.assetCount ?? 0;
  const debtCount = dashboardData?.debtCount ?? 0;
  const assetAllocation = dashboardData?.assetAllocation ?? [];
  const financialProjections = dashboardData?.financialProjections ?? [];
  const yearsUntilRetirement = dashboardData?.yearsUntilRetirement ?? 0;
  const currentSavings = dashboardData?.currentSavings ?? 0;
  const projectedRetirement =
    financialProjections.find(p => p.year === yearsUntilRetirement)?.value;
  const priorityGoal = getHighestPriorityGoal();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Overview of your financial health and progress towards goals
        </p>
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
          <p className="mt-2 text-gray-500">Loading your financial data...</p>
        </div>
      ) : (
        <>
          <motion.div 
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <NetWorthCard 
                netWorth={netWorth}
                assets={totalAssets}
                debts={totalDebts}
              />
            </motion.div>
            
            <motion.div variants={item} className="md:col-span-1">
              <AssetAllocationCard 
                allocations={assetAllocation}
                total={totalAssets}
              />
            </motion.div>
            
            <motion.div variants={item} className="md:col-span-2">
              <FinancialProjectionsCard 
                projections={financialProjections}
                yearsUntilRetirement={yearsUntilRetirement}
              />
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {priorityGoal && (
              <motion.div variants={item}>
                <ProgressChart
                  currentSavings={currentSavings}
                  targetSavings={priorityGoal.targetAmount}
                  projectedAtRetirement={projectedRetirement}
                  goalName={priorityGoal.name}
                />
              </motion.div>
            )}
            
            <motion.div variants={item} className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-700">Recent Activity</h3>
              {assetCount === 0 && debtCount === 0 && goals.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>Add assets, debts, or goals to see your financial activity</p>
                  <div className="flex justify-center mt-4 space-x-4">
                    <button 
                      className="btn bg-white px-4 py-2 text-sm text-primary ring-1 ring-primary hover:bg-gray-50"
                      onClick={() => router.push('/dashboard/assets')}
                    >
                      Add Assets
                    </button>
                    <button 
                      className="btn bg-white px-4 py-2 text-sm text-primary ring-1 ring-primary hover:bg-gray-50"
                      onClick={() => router.push('/dashboard/debts')}
                    >
                      Add Debts
                    </button>
                    <button 
                      className="btn bg-white px-4 py-2 text-sm text-primary ring-1 ring-primary hover:bg-gray-50"
                      onClick={() => router.push('/dashboard/goals')}
                    >
                      Add Goals
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetCount > 0 && (
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Total Assets</p>
                        <p className="text-sm text-gray-500">{assetCount} assets tracked</p>
                      </div>
                      <p className="font-medium text-green-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalAssets)}
                      </p>
                    </div>
                  )}
                  
                  {debtCount > 0 && (
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Total Debts</p>
                        <p className="text-sm text-gray-500">{debtCount} debts tracked</p>
                      </div>
                      <p className="font-medium text-red-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(-totalDebts)}
                      </p>
                    </div>
                  )}
                  
                  {goals.length > 0 && (
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Financial Goals</p>
                        <p className="text-sm text-gray-500">{goals.filter(g => g.isActive).length} active goals</p>
                      </div>
                      <button 
                        className="text-primary hover:text-blue-700 text-sm font-medium"
                        onClick={() => router.push('/dashboard/goals')}
                      >
                        View Goals →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
          
        <ChatInterface />
      </>
    )}

    <Modal
      isOpen={showWizard}
      onClose={() => setShowWizard(false)}
      title="Set Your Financial Goals"
    >
      <p className="mb-4 text-sm text-gray-700">You don't have any goals yet. Would you like to go through the goal setup wizard?</p>
      <div className="flex justify-end space-x-2">
        <button className="btn" onClick={() => setShowWizard(false)}>Later</button>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowWizard(false);
            router.push('/dashboard/goals/wizard');
          }}
        >
          Start Wizard
        </button>
      </div>
    </Modal>
  </>
  );
};

Dashboard.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>;
};

export default Dashboard;
