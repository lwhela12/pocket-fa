import type { NextApiRequest, NextApiResponse } from 'next';
import type { Expense } from '@prisma/client';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Category mapping for expenses
const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Healthcare',
  'Entertainment',
  'Miscellaneous',
];

// Frequency multiplier to convert to monthly amount
const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  'one-time': 1,
  'weekly': 4.33, // average weeks per month
  'bi-weekly': 2.165,
  'monthly': 1,
  'quarterly': 0.333,
  'annually': 0.0833,
};

async function categorizeExpense(description: string): Promise<{ category: string; confidence: number }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `You are a financial categorization assistant. Categorize the following expense description into EXACTLY ONE of these categories:
${EXPENSE_CATEGORIES.join(', ')}

Expense description: "${description}"

Respond with ONLY a JSON object in this exact format:
{
  "category": "CategoryName",
  "confidence": 0.95
}

The category MUST be one of the categories listed above. The confidence should be between 0 and 1.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate category
    if (!EXPENSE_CATEGORIES.includes(parsed.category)) {
      return { category: 'Miscellaneous', confidence: 0.5 };
    }

    return {
      category: parsed.category,
      confidence: Math.min(Math.max(parsed.confidence, 0), 1),
    };
  } catch (error) {
    console.error('Error categorizing expense:', error);
    return { category: 'Miscellaneous', confidence: 0.3 };
  }
}

function calculateMonthlyAmount(amount: number, frequency: string): number {
  const multiplier = FREQUENCY_MULTIPLIERS[frequency.toLowerCase()] || 1;
  return amount * multiplier;
}

async function updateExpenseRecord(
  userId: string,
  category: string,
  monthlyAmount: number,
  month: Date
) {
  // Get or create expense record for this month
  const existing = await prisma.expenseRecord.findUnique({
    where: {
      userId_month: {
        userId,
        month,
      }
    },
  });

  const categoryField = category.toLowerCase() as keyof typeof existing;
  const currentCategoryTotal = existing?.[categoryField] as number || 0;
  const newCategoryTotal = currentCategoryTotal + monthlyAmount;

  // Calculate new total monthly
  const currentTotal = existing?.totalMonthly || 0;
  const newTotal = currentTotal + monthlyAmount;

  if (existing) {
    return prisma.expenseRecord.update({
      where: { id: existing.id },
      data: {
        [categoryField]: newCategoryTotal,
        totalMonthly: newTotal,
        isDetailed: true,
      },
    });
  }

  return prisma.expenseRecord.create({
    data: {
      userId,
      month,
      isDetailed: true,
      totalMonthly: newTotal,
      [categoryField]: newCategoryTotal,
    },
  });
}

export default createApiHandler<Expense | { category: string; confidence: number }>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Expense | { category: string; confidence: number }>>
) => {
  const userId = await authenticate(req);

  // POST: categorize expense description (preview only)
  if (req.method === 'POST' && req.query.preview === 'true') {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    const result = await categorizeExpense(description);
    return res.status(200).json({ success: true, data: result });
  }

  // POST: add new expense with auto-categorization
  if (req.method === 'POST') {
    const { description, amount, frequency, date, merchant, category: userCategory } = req.body;

    if (!description || !amount || !frequency) {
      return res.status(400).json({
        success: false,
        error: 'Description, amount, and frequency are required',
      });
    }

    // Use user-provided category or auto-categorize
    let category: string;
    if (userCategory && EXPENSE_CATEGORIES.includes(userCategory)) {
      category = userCategory;
    } else {
      const result = await categorizeExpense(description);
      category = result.category;
    }

    const expenseDate = date ? new Date(date) : new Date();
    const monthlyAmount = calculateMonthlyAmount(parseFloat(amount), frequency);
    const isRecurring = frequency.toLowerCase() !== 'one-time';

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        userId,
        description,
        amount: parseFloat(amount),
        category,
        frequency: frequency.toLowerCase(),
        date: expenseDate,
        merchant: merchant || null,
        isRecurring,
        sourceType: 'quick_entry',
      },
    });

    // Update expense record for the month
    const expenseMonth = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1);
    await updateExpenseRecord(userId, category, monthlyAmount, expenseMonth);

    // Link expense to record
    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        expenseRecordId: (
          await prisma.expenseRecord.findUnique({
            where: { userId_month: { userId, month: expenseMonth } },
          })
        )?.id,
      },
    });

    return res.status(201).json({ success: true, data: expense });
  }

  // DELETE: remove expense and update expense record
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Expense ID is required' });
    }

    const expense = await prisma.expense.findUnique({ where: { id: id as string } });
    if (!expense || expense.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    // Calculate monthly amount to subtract
    const monthlyAmount = calculateMonthlyAmount(expense.amount, expense.frequency);
    const expenseMonth = new Date(expense.date.getFullYear(), expense.date.getMonth(), 1);

    // Update expense record
    const record = await prisma.expenseRecord.findUnique({
      where: { userId_month: { userId, month: expenseMonth } },
    });

    if (record) {
      const categoryField = expense.category.toLowerCase() as keyof typeof record;
      const currentCategoryTotal = (record[categoryField] as number) || 0;
      const newCategoryTotal = Math.max(0, currentCategoryTotal - monthlyAmount);
      const newTotal = Math.max(0, (record.totalMonthly || 0) - monthlyAmount);

      await prisma.expenseRecord.update({
        where: { id: record.id },
        data: {
          [categoryField]: newCategoryTotal,
          totalMonthly: newTotal,
        },
      });
    }

    // Delete the expense
    await prisma.expense.delete({ where: { id: id as string } });

    return res.status(200).json({ success: true, data: expense });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});
