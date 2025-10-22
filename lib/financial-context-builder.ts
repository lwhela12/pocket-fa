import prisma from './prisma';
import { futureValue, futureValueOfAnnuity } from '../utils/tvm';

// Constants for calculations
const DEFAULT_AGE = 35;
const DEFAULT_RETIREMENT_AGE = 65;
const DEFAULT_INVESTMENT_RETURN = 7; // in percent
const PROJECTION_YEARS = 30;
const SAFE_WITHDRAWAL_RATE = 0.04;

export interface FinancialContext {
  profile: {
    age: number | null;
    retirementAge: number | null;
    riskTolerance: string | null;
    inflationRate: number;
    investmentReturn: number;
    savingsRate: number;
  };
  summary: {
    netWorth: number;
    totalAssets: number;
    totalDebts: number;
    assetCount: number;
    debtCount: number;
    currentSavings: number;
    targetSavings: number;
    yearsUntilRetirement: number;
  };
  assets: Array<{
    id: string;
    type: string;
    subtype: string | null;
    name: string;
    balance: number;
    interestRate: number | null;
    annualContribution: number | null;
    growthRate: number | null;
    assetClass: string | null;
  }>;
  debts: Array<{
    id: string;
    type: string;
    lender: string;
    balance: number;
    interestRate: number;
    monthlyPayment: number;
    termLength: number | null;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string | null;
    priority: number;
    isActive: boolean;
    progressPercentage: number;
  }>;
  expenses: {
    currentMonth: string;
    summary: {
      totalMonthly: number;
      living: number;
      entertainment: number;
      discretionary: number;
    } | null;
    breakdown: {
      housing: number;
      utilities: number;
      groceries: number;
      dining: number;
      transport: number;
      healthcare: number;
      entertainment: number;
      miscellaneous: number;
    } | null;
  };
  insurance: Array<{
    id: string;
    type: string;
    coverage: number;
    isEmployerProvided: boolean;
  }>;
  financialProjections: Array<{
    year: number;
    value: number;
  }>;
  assetAllocation: Array<{
    label: string;
    value: number;
    percentage: number;
  }>;
}

/**
 * Builds a comprehensive financial context for the user
 * This includes all assets, debts, goals, expenses, insurance, and projections
 * @param userId - The user ID to build context for
 * @returns A complete financial context object
 */
export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  // Get current month for expense lookup
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  // Fetch all user data in parallel for performance
  const [profile, assets, debts, goals, expenseRecord, insurance] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.asset.findMany({ where: { userId }, orderBy: { balance: 'desc' } }),
    prisma.debt.findMany({ where: { userId }, orderBy: { balance: 'desc' } }),
    prisma.financialGoal.findMany({
      where: { userId, isActive: true },
      orderBy: { priority: 'asc' }
    }),
    prisma.expenseRecord.findUnique({
      where: { userId_month: { userId, month: currentMonth } }
    }),
    prisma.insurancePolicy.findMany({ where: { userId } }),
  ]);

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Calculate retirement savings (Investment + Cash assets)
  const currentSavings = assets
    .filter(asset => asset.type === 'Investment' || asset.type === 'Cash')
    .reduce((sum, asset) => sum + asset.balance, 0);

  const annualContribution = assets
    .filter(asset => asset.annualContribution)
    .reduce((sum, asset) => sum + (asset.annualContribution || 0), 0);

  // Profile data with defaults
  const age = profile?.age || DEFAULT_AGE;
  const retirementAge = profile?.retirementAge || DEFAULT_RETIREMENT_AGE;
  const yearsUntilRetirement = Math.max(0, retirementAge - age);
  const growthRate = profile?.investmentReturn || DEFAULT_INVESTMENT_RETURN;
  const rate = growthRate / 100;

  // Calculate financial projections
  const financialProjections = [];
  for (let year = 0; year <= PROJECTION_YEARS; year++) {
    const projectedValue =
      futureValue(currentSavings, rate, year) +
      futureValueOfAnnuity(annualContribution, rate, year);
    financialProjections.push({
      year,
      value: Math.round(projectedValue),
    });
  }

  // Calculate target savings
  const estimatedAnnualExpenses = (annualContribution / 0.2) * 0.8 * 0.75 || 50000;
  const targetSavings = estimatedAnnualExpenses / SAFE_WITHDRAWAL_RATE;

  // Calculate asset allocation
  const allocationMap = assets.reduce((acc, asset) => {
    if (asset.type === 'Lifestyle') {
      acc['Lifestyle'] = (acc['Lifestyle'] || 0) + asset.balance;
      return acc;
    }

    let key = asset.assetClass || asset.type || 'Other';
    if (key === 'Cash Equivalents') key = 'Cash';
    if (key === 'Mutual Funds') key = 'ETFs';

    acc[key] = (acc[key] || 0) + asset.balance;
    return acc;
  }, {} as Record<string, number>);

  const assetAllocation = Object.entries(allocationMap)
    .map(([label, value]) => ({
      label,
      value: Math.round(value),
      percentage: totalAssets > 0 ? Math.round((value / totalAssets) * 100) : 0,
    }))
    .filter(allocation => allocation.value > 0);

  // Build expense summary
  let expenseSummary = null;
  let expenseBreakdown = null;

  if (expenseRecord) {
    const living = (expenseRecord.housing || 0) +
                   (expenseRecord.utilities || 0) +
                   (expenseRecord.groceries || 0) +
                   (expenseRecord.transport || 0) +
                   (expenseRecord.healthcare || 0);

    const entertainment = (expenseRecord.dining || 0) +
                         (expenseRecord.entertainment || 0);

    const discretionary = expenseRecord.miscellaneous || 0;
    const total = expenseRecord.totalMonthly || 0;

    expenseSummary = {
      totalMonthly: Math.round(total),
      living: Math.round(living),
      entertainment: Math.round(entertainment),
      discretionary: Math.round(discretionary),
    };

    expenseBreakdown = {
      housing: Math.round(expenseRecord.housing || 0),
      utilities: Math.round(expenseRecord.utilities || 0),
      groceries: Math.round(expenseRecord.groceries || 0),
      dining: Math.round(expenseRecord.dining || 0),
      transport: Math.round(expenseRecord.transport || 0),
      healthcare: Math.round(expenseRecord.healthcare || 0),
      entertainment: Math.round(expenseRecord.entertainment || 0),
      miscellaneous: Math.round(expenseRecord.miscellaneous || 0),
    };
  }

  // Build the complete context
  return {
    profile: {
      age: profile?.age || null,
      retirementAge: profile?.retirementAge || null,
      riskTolerance: profile?.riskTolerance || null,
      inflationRate: profile?.inflationRate || 3.0,
      investmentReturn: profile?.investmentReturn || 7.0,
      savingsRate: profile?.savingsRate || 10.0,
    },
    summary: {
      netWorth: Math.round(netWorth),
      totalAssets: Math.round(totalAssets),
      totalDebts: Math.round(totalDebts),
      assetCount: assets.length,
      debtCount: debts.length,
      currentSavings: Math.round(currentSavings),
      targetSavings: Math.round(targetSavings),
      yearsUntilRetirement,
    },
    assets: assets.map(asset => ({
      id: asset.id,
      type: asset.type,
      subtype: asset.subtype,
      name: asset.name,
      balance: Math.round(asset.balance),
      interestRate: asset.interestRate,
      annualContribution: asset.annualContribution ? Math.round(asset.annualContribution) : null,
      growthRate: asset.growthRate,
      assetClass: asset.assetClass,
    })),
    debts: debts.map(debt => ({
      id: debt.id,
      type: debt.type,
      lender: debt.lender,
      balance: Math.round(debt.balance),
      interestRate: debt.interestRate,
      monthlyPayment: Math.round(debt.monthlyPayment),
      termLength: debt.termLength,
    })),
    goals: goals.map(goal => {
      const progress = goal.targetAmount > 0
        ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
        : 0;
      return {
        id: goal.id,
        name: goal.name,
        targetAmount: Math.round(goal.targetAmount),
        currentAmount: Math.round(goal.currentAmount),
        targetDate: goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : null,
        priority: goal.priority,
        isActive: goal.isActive,
        progressPercentage: progress,
      };
    }),
    expenses: {
      currentMonth: currentMonth.toISOString().split('T')[0],
      summary: expenseSummary,
      breakdown: expenseBreakdown,
    },
    insurance: insurance.map(policy => ({
      id: policy.id,
      type: policy.type,
      coverage: Math.round(policy.coverage),
      isEmployerProvided: policy.isEmployerProvided,
    })),
    financialProjections,
    assetAllocation,
  };
}

/**
 * Formats the financial context as a JSON string for use in chat prompts
 * @param context - The financial context to format
 * @returns A formatted JSON string
 */
export function formatFinancialContextForChat(context: FinancialContext): string {
  return JSON.stringify(context, null, 2);
}
