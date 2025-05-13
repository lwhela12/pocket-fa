import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import prisma from '../../lib/prisma';

type ChatResponse = {
  message: string;
};

export default createApiHandler<ChatResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ChatResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const userId = await authenticate(req);

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // In a real application, this would call an AI service like Gemini
    // For now, we'll implement simple rules for demonstration purposes
    let response = '';

    const lowerMessage = message.toLowerCase();

    // Get user's data for personalized responses
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const assets = await prisma.asset.findMany({
      where: { userId },
    });

    const debts = await prisma.debt.findMany({
      where: { userId },
    });

    // Calculate net worth
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const netWorth = totalAssets - totalDebts;

    // Simple rule-based responses
    if (lowerMessage.includes('retirement') || lowerMessage.includes('on track')) {
      const retirementAge = user?.profile?.retirementAge || 65;
      const age = user?.profile?.age || 35;
      const yearsToRetirement = retirementAge - age;
      
      response = `Based on your current savings of $${totalAssets.toLocaleString()} and expected retirement age of ${retirementAge}, you're on track to reach about 75% of your retirement goal. To improve this, consider increasing your monthly contributions or adjusting your retirement age.`;
    } 
    else if (lowerMessage.includes('debt') || lowerMessage.includes('pay off')) {
      const highestInterestDebt = debts.sort((a, b) => b.interestRate - a.interestRate)[0];
      
      if (highestInterestDebt) {
        response = `Looking at your debts, I'd recommend focusing on your ${highestInterestDebt.type} from ${highestInterestDebt.lender} first (${highestInterestDebt.interestRate.toFixed(2)}% APR). By increasing your monthly payment from $${highestInterestDebt.monthlyPayment.toLocaleString()} to $${(highestInterestDebt.monthlyPayment * 1.5).toLocaleString()}, you could pay it off significantly faster and save on interest.`;
      } else {
        response = `I don't see any debts in your profile. If you have debts to manage, please add them in the Debts section so I can provide specific advice.`;
      }
    }
    else if (lowerMessage.includes('savings rate') || lowerMessage.includes('save more')) {
      const savingsRate = user?.profile?.savingsRate || 10;
      
      response = `For someone in your age bracket and financial situation, a savings rate of 15-20% is typically recommended. You're currently at ${savingsRate}%. Increasing automatic transfers to your investment accounts by $200-$300 per month would help you reach the optimal range.`;
    }
    else if (lowerMessage.includes('net worth')) {
      response = `Your current net worth is $${netWorth.toLocaleString()}, with $${totalAssets.toLocaleString()} in assets and $${totalDebts.toLocaleString()} in debts. This is an important financial metric to track over time.`;
    }
    else {
      response = `I'd need more information about your financial situation to answer that accurately. Feel free to ask about retirement planning, debt management, savings rates, or your net worth.`;
    }

    return res.status(200).json({
      success: true,
      data: {
        message: response,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process chat message' });
  }
});