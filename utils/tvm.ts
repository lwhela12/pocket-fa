export interface AssetProjectionInput {
  balance: number;
  growthRate?: number | null;
  interestRate?: number | null;
  annualContribution?: number | null;
}

export function projectAssetValue(asset: AssetProjectionInput, years: number): number {
  const rate = (asset.growthRate ?? asset.interestRate ?? 0) / 100;
  const contribution = asset.annualContribution ?? 0;
  if (years <= 0) return asset.balance;
  if (rate === 0) {
    return asset.balance + contribution * years;
  }
  const fvPrincipal = asset.balance * Math.pow(1 + rate, years);
  const fvContrib = contribution * ((Math.pow(1 + rate, years) - 1) / rate);
  return fvPrincipal + fvContrib;
}

export function futureValue(principal: number, rate: number, years: number): number {
  if (years <= 0) return principal;
  if (rate === 0) return principal;
  return principal * Math.pow(1 + rate, years);
}

export function futureValueOfAnnuity(payment: number, rate: number, years: number): number {
  if (years <= 0) return 0;
  if (rate === 0) return payment * years;
  return payment * ((Math.pow(1 + rate, years) - 1) / rate);
}

export function calculateGoalSuccess(
  goalAmount: number,
  goalYears: number,
  assets: AssetProjectionInput[],
): number {
  const startBalance = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalFuture = assets.reduce(
    (sum, asset) => sum + projectAssetValue(asset, goalYears),
    0,
  );
  if (goalAmount === 0) return 100;
  // If goal date is in the past, compare current balance
  if (goalYears <= 0) {
    return Math.min(100, (startBalance / goalAmount) * 100);
  }
  return Math.min(100, (totalFuture / goalAmount) * 100);
}
