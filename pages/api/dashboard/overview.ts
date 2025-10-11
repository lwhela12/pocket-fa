import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { futureValue, futureValueOfAnnuity } from '../../../utils/tvm';

// Constants for default values
const DEFAULT_AGE = 35;
const DEFAULT_RETIREMENT_AGE = 65;
const DEFAULT_INVESTMENT_RETURN = 7; // in percent
const PROJECTION_YEARS = 30;
const SAFE_WITHDRAWAL_RATE = 0.04;

type AssetAllocation = {
  label: string;
  value: number;
};

type ProjectionPoint = {
  year: number;
  value: number;
};

type ExpenseSummary = {
  living: number;
  entertainment: number;
  discretionary: number;
  total: number;
};

type DashboardResponse = {
  netWorth: number;
  /** Total assets value */
  assets: number;
  /** Total debts value */
  debts: number;
  /** Number of asset records */
  assetCount: number;
  /** Number of debt records */
  debtCount: number;
  assetAllocation: AssetAllocation[];
  financialProjections: ProjectionPoint[];
  yearsUntilRetirement: number;
  currentSavings: number;
  targetSavings: number;
  expenseSummary: ExpenseSummary | null;
};

export default createApiHandler<DashboardResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<DashboardResponse>>
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const userId = await authenticate(req);

    // Get current month for expense lookup
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    // Fetch all user data in parallel
    const [assets, debts, profile, expenseRecord] = await Promise.all([
      prisma.asset.findMany({ where: { userId } }),
      prisma.debt.findMany({ where: { userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.expenseRecord.findUnique({
        where: {
          userId_month: { userId, month: currentMonth }
        }
      }),
    ]);

    // Calculate net worth
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const netWorth = totalAssets - totalDebts;

    // Calculate asset allocation by asset class
    const allocationMap = assets.reduce((acc, asset) => {
      // For Lifestyle assets, use type instead of asset class
      if (asset.type === 'Lifestyle') {
        acc['Lifestyle'] = (acc['Lifestyle'] || 0) + asset.balance;
        return acc;
      }

      // Use asset class if available, otherwise use type
      let key = asset.assetClass || asset.type || 'Other';

      // Normalize some common variations
      if (key === 'Cash Equivalents') key = 'Cash';
      if (key === 'Mutual Funds') key = 'ETFs'; // Group similar investments

      acc[key] = (acc[key] || 0) + asset.balance;
      return acc;
    }, {} as Record<string, number>);

    const assetAllocation: AssetAllocation[] = Object.entries(allocationMap)
      .map(([label, value]) => ({ label, value }))
      .filter(allocation => allocation.value > 0);

    // Calculate years until retirement
    const age = profile?.age || DEFAULT_AGE;
    const retirementAge = profile?.retirementAge || DEFAULT_RETIREMENT_AGE;
    const yearsUntilRetirement = Math.max(0, retirementAge - age);

    // Calculate retirement savings (Investment + Cash assets, matching goals page)
    const currentSavings = assets
      .filter(asset => asset.type === 'Investment' || asset.type === 'Cash')
      .reduce((sum, asset) => sum + asset.balance, 0);
    const annualContribution = assets
      .filter(asset => asset.annualContribution)
      .reduce((sum, asset) => sum + (asset.annualContribution || 0), 0);
    const growthRate = profile?.investmentReturn || DEFAULT_INVESTMENT_RETURN;
    const rate = growthRate / 100;

    const financialProjections: ProjectionPoint[] = [];
    for (let year = 0; year <= PROJECTION_YEARS; year++) {
      const projectedValue = futureValue(currentSavings, rate, year) + futureValueOfAnnuity(annualContribution, rate, year);
      financialProjections.push({
        year,
        value: projectedValue,
      });
    }

    // Calculate target savings based on estimated expenses
    // Placeholder: Estimate annual expenses as 60% of annual contributions * 5 (assuming a 20% savings rate)
    // This is a rough estimate and should be replaced with actual expense data.
    const estimatedAnnualExpenses = (annualContribution / 0.2) * 0.8 * 0.75 || 50000; // Fallback to 50k
    const targetSavings = estimatedAnnualExpenses / SAFE_WITHDRAWAL_RATE;

    // Calculate expense summary
    let expenseSummary: ExpenseSummary | null = null;
    if (expenseRecord) {
      // Living = Housing + Utilities + Groceries + Transport + Healthcare
      const living = (expenseRecord.housing || 0) +
                    (expenseRecord.utilities || 0) +
                    (expenseRecord.groceries || 0) +
                    (expenseRecord.transport || 0) +
                    (expenseRecord.healthcare || 0);

      // Entertainment = Dining + Entertainment
      const entertainment = (expenseRecord.dining || 0) +
                           (expenseRecord.entertainment || 0);

      // Discretionary = Miscellaneous
      const discretionary = expenseRecord.miscellaneous || 0;

      const total = expenseRecord.totalMonthly || 0;

      expenseSummary = {
        living,
        entertainment,
        discretionary,
        total,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        netWorth,
        assets: totalAssets,
        debts: totalDebts,
        assetCount: assets.length,
        debtCount: debts.length,
        assetAllocation,
        financialProjections,
        yearsUntilRetirement,
        currentSavings,
        targetSavings,
        expenseSummary,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});
