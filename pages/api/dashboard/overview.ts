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
  assets: number;
  debts: number;
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

    // If we have no real data, add placeholder data
    if (assetAllocation.length === 0) {
      assetAllocation.push(
        { label: 'Cash', value: 50000, color: '#4CAF50' },
        { label: 'Stocks', value: 100000, color: '#2196F3' },
        { label: 'Bonds', value: 50000, color: '#FFC107' },
        { label: 'Real Estate', value: 50000, color: '#9C27B0' }
      );
    }

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

    // Calculate target savings
    // For a simple calculation, we'll assume 25x annual expenses
    // In a real app, this would be more sophisticated
    const targetSavings = 1000000; // Placeholder value

    return res.status(200).json({
      success: true,
      data: {
        netWorth,
        assets: totalAssets,
        debts: totalDebts,
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