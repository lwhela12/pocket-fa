// @ts-nocheck
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
import Modal from '../../components/layout/Modal';

// Types
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

type Debt = {
  id: string;
  type: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termLength: number | null;
};

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Fetch data when component mounts
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Use Promise.all to fetch all data in parallel
      const [assetsResponse, debtsResponse, goalsResponse] = await Promise.all([
        fetchApi('/api/dashboard/assets'),
        fetchApi('/api/dashboard/debts'),
        fetchApi('/api/dashboard/goals')
      ]);
      
      // Process responses
      const hasError = !assetsResponse.success || !debtsResponse.success || !goalsResponse.success;
      
      if (hasError) {
        // Handle API error
        const errorMessage = [
          assetsResponse.success ? '' : 'Failed to fetch assets.',
          debtsResponse.success ? '' : 'Failed to fetch debts.',
          goalsResponse.success ? '' : 'Failed to fetch goals.'
        ].filter(Boolean).join(' ');
        
        setError(errorMessage || 'Failed to fetch dashboard data');
      } else {
        // Set data from successful responses
        setAssets(assetsResponse.data || []);
        setDebts(debtsResponse.data || []);
        setGoals((goalsResponse.data || []).map((goal: any) => ({
          ...goal,
          targetDate: goal.targetDate ? new Date(goal.targetDate) : null
        })));
        if ((goalsResponse.data || []).length === 0) {
          setShowWizard(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate net worth
  const calculateNetWorth = () => {
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
    return totalAssets - totalDebts;
  };

  // Prepare asset allocation data for the chart
  const prepareAssetAllocationData = () => {
    // Group assets by asset class
    const assetsByClass = assets.reduce<Record<string, number>>((acc, asset) => {
      const assetClass = asset.assetClass || (asset.type === 'Cash' ? 'Cash' : 'Other');
      acc[assetClass] = (acc[assetClass] || 0) + asset.balance;
      return acc;
    }, {});
    
    // Convert to array format needed for the chart
    return Object.entries(assetsByClass).map(([label, value]) => ({
      label,
      value,
      color: assetClassColors[label as keyof typeof assetClassColors] || assetClassColors.Unknown
    }));
  };

  // Prepare financial projections data using a fixed 7% growth rate
  const prepareFinancialProjections = () => {
    const netWorth = calculateNetWorth();
    const growthRate = 7 / 100;
    return Array.from({ length: 31 }, (_, i) => ({
      year: i,
      value: netWorth * Math.pow(1 + growthRate, i),
    }));
  };

  const calculateCurrentSavings = () => {
    return assets
      .filter(a => a.type === 'Investment' || a.type === 'Cash')
      .reduce((sum, a) => sum + a.balance, 0);
  };

  const calculateProjectedRetirementBalance = (years: number) => {
    return assets
      .filter(a => a.type === 'Investment' || a.type === 'Cash')
      .reduce((sum, a) => {
        const rate = (a.growthRate ?? 7) / 100;
        let future = a.balance * Math.pow(1 + rate, years);
        if (a.annualContribution) {
          for (let i = 0; i < years; i++) {
            future += a.annualContribution * Math.pow(1 + rate, years - i - 1);
          }
        }
        return sum + future;
      }, 0);
  };

  // Calculate years until retirement
  const calculateYearsUntilRetirement = () => {
    // Look for retirement goal or default to 25 years
    const retirementGoal = goals.find(goal => 
      goal.name.toLowerCase().includes('retirement') && goal.isActive
    );
    
    if (retirementGoal && retirementGoal.targetDate) {
      const today = new Date();
      const retirementDate = new Date(retirementGoal.targetDate);
      return Math.max(0, Math.round((retirementDate.getTime() - today.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
    }
    
    return 25; // Default assumption
  };

  // Find the highest priority active goal
  const getHighestPriorityGoal = () => {
    const activeGoals = goals.filter(goal => goal.isActive);
    if (activeGoals.length === 0) return null;
    
    // Sort by priority (lower number = higher priority)
    return activeGoals.sort((a, b) => a.priority - b.priority)[0];
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
  const netWorth = calculateNetWorth();
  const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const assetAllocation = prepareAssetAllocationData();
  const financialProjections = prepareFinancialProjections();
  const yearsUntilRetirement = calculateYearsUntilRetirement();
  const currentSavings = calculateCurrentSavings();
  const projectedRetirement = calculateProjectedRetirementBalance(yearsUntilRetirement);
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
              {assets.length === 0 && debts.length === 0 && goals.length === 0 ? (
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
                  {assets.length > 0 && (
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Total Assets</p>
                        <p className="text-sm text-gray-500">{assets.length} assets tracked</p>
                      </div>
                      <p className="font-medium text-green-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(totalAssets)}
                      </p>
                    </div>
                  )}
                  
                  {debts.length > 0 && (
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Total Debts</p>
                        <p className="text-sm text-gray-500">{debts.length} debts tracked</p>
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