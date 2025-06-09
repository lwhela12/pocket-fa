import handler from '../pages/api/chat';
import prisma from '../lib/prisma';

// Enable dev-mode authentication fallback
process.env.NODE_ENV = 'development';

// Mock Prisma client methods
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    asset: { findMany: jest.fn() },
    debt: { findMany: jest.fn() },
    financialGoal: { findMany: jest.fn() },
  },
}));

// Utility to create mock Next.js request and response
const createMocks = () => {
  const req: any = { method: 'GET', headers: {}, body: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return { req, res };
};

describe('/api/chat', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('returns summary snapshot for __init__ request', async () => {
    // Mock user and financial data
    const testUser = { id: '123', profile: { age: 30, retirementAge: 65, riskTolerance: 'Moderate', savingsRate: 10, financialKnowledge: 'basic' } };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(testUser);
    (prisma.asset.findMany as jest.Mock).mockResolvedValue([{ type: 'Cash', balance: 100 }]);
    (prisma.debt.findMany as jest.Mock).mockResolvedValue([{ type: 'Loan', balance: 50 }]);
    (prisma.financialGoal.findMany as jest.Mock).mockResolvedValue([
      { name: 'Retirement', targetAmount: 1000, currentAmount: 100, targetDate: new Date(), isActive: true, priority: 1 },
    ]);

    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { message: '__init__', history: [] };
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.data.message).toContain('Total Assets: $100');
    expect(jsonResponse.data.message).toContain('Total Debts: $50');
  });
});