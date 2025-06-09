import { projectAssetValue, calculateGoalSuccess, AssetProjectionInput } from '../utils/tvm';

describe('projectAssetValue', () => {
  it('returns original balance when years <= 0', () => {
    const asset: AssetProjectionInput = { balance: 1000, growthRate: 5, annualContribution: 100 };
    expect(projectAssetValue(asset, 0)).toBe(1000);
    expect(projectAssetValue(asset, -5)).toBe(1000);
  });

  it('calculates future value with zero rate', () => {
    const asset: AssetProjectionInput = { balance: 500, growthRate: 0, annualContribution: 50 };
    expect(projectAssetValue(asset, 3)).toBe(500 + 50 * 3);
  });

  it('calculates future value with rate and contribution', () => {
    const asset: AssetProjectionInput = { balance: 100, growthRate: 10, annualContribution: 10 };
    const years = 2;
    const rate = 0.10;
    const expectedPrincipal = asset.balance * Math.pow(1 + rate, years);
    const expectedContrib = asset.annualContribution! * ((Math.pow(1 + rate, years) - 1) / rate);
    expect(projectAssetValue(asset, years)).toBeCloseTo(expectedPrincipal + expectedContrib, 6);
  });
});

describe('calculateGoalSuccess', () => {
  it('returns 100% when goalAmount is 0', () => {
    expect(calculateGoalSuccess(0, 5, [])).toBe(100);
  });

  it('calculates current balance percentage when goalYears <= 0', () => {
    const assets: AssetProjectionInput[] = [{ balance: 200 }, { balance: 300 }];
    expect(calculateGoalSuccess(500, 0, assets)).toBe(100);
    expect(calculateGoalSuccess(1000, 0, assets)).toBeCloseTo((500 / 1000) * 100);
  });

  it('calculates future balance percentage when goalYears > 0', () => {
    const assets: AssetProjectionInput[] = [{ balance: 100, growthRate: 50, annualContribution: 0 }];
    // projectAssetValue = 100*(1.5^2) = 100*2.25 = 225
    expect(calculateGoalSuccess(300, 2, assets)).toBeCloseTo((225 / 300) * 100);
  });
});