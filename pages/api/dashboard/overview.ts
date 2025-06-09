import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

type AssetAllocation = {
  label: string;
  value: number;
  color: string;
};

type ProjectionPoint = {
  year: number;
  value: number;
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

    // Get user assets
    const assets = await prisma.asset.findMany({
      where: { userId },
    });

    // Get user debts
    const debts = await prisma.debt.findMany({
      where: { userId },
    });

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    // Calculate net worth
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const netWorth = totalAssets - totalDebts;

    // Calculate asset allocation
    const assetAllocation: AssetAllocation[] = [
      {
        label: 'Cash',
        value: assets.filter(asset => asset.type === 'Cash').reduce((sum, asset) => sum + asset.balance, 0),
        color: '#4CAF50',
      },
      {
        label: 'Stocks',
        value: assets.filter(asset => asset.assetClass === 'Stocks').reduce((sum, asset) => sum + asset.balance, 0),
        color: '#2196F3',
      },
      {
        label: 'Bonds',
        value: assets.filter(asset => asset.assetClass === 'Bonds').reduce((sum, asset) => sum + asset.balance, 0),
        color: '#FFC107',
      },
      {
        label: 'Other Investments',
        value: assets.filter(asset => 
          asset.type === 'Investment' && 
          asset.assetClass !== 'Stocks' && 
          asset.assetClass !== 'Bonds'
        ).reduce((sum, asset) => sum + asset.balance, 0),
        color: '#9C27B0',
      },
    ].filter(allocation => allocation.value > 0);


    // Calculate years until retirement
    const age = profile?.age || 35;
    const retirementAge = profile?.retirementAge || 65;
    const yearsUntilRetirement = Math.max(0, retirementAge - age);

    // Calculate financial projections
    const currentSavings = netWorth;
    const annualContribution = assets
      .filter(asset => asset.annualContribution)
      .reduce((sum, asset) => sum + (asset.annualContribution || 0), 0);
    const growthRate = profile?.investmentReturn || 7;
    const growthRateFactor = 1 + (growthRate / 100);

    const financialProjections: ProjectionPoint[] = [];
    let projectedValue = currentSavings;

    for (let year = 0; year <= 30; year++) {
      financialProjections.push({
        year,
        value: projectedValue,
      });

      projectedValue = (projectedValue * growthRateFactor) + annualContribution;
    }

    // Calculate target savings (e.g., 25x annual expenses)
    // TODO: Replace placeholder logic with real expense-based calculation
    const targetSavings = 1000000;

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
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});