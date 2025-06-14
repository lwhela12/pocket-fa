import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import prisma from '../../lib/prisma';
import { startChat, sendMessage } from '../../lib/gemini-service';

type ChatResponse = {
  message: string;
};


const isRetirementAsset = (asset: { subtype?: string | null }) => {
  const subtype = asset.subtype?.toLowerCase() || '';
  return subtype.includes('ira') || subtype.includes('401');
};

export default createApiHandler<ChatResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ChatResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }


  try {
    const userId = await authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { message: userQuery, history: clientHistory = [] } = req.body;

    if (!userQuery) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Fetch user's data for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const assets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { balance: 'desc' },
    });

    const debts = await prisma.debt.findMany({
      where: { userId },
      orderBy: { balance: 'desc' },
    });

    const goals = await prisma.financialGoal.findMany({
        where: { userId },
        orderBy: { priority: 'asc' }
    });

    // If initializing, return a snapshot summary
    if (userQuery === '__init__') {
      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalDebts = debts.reduce((sum, d) => sum + d.balance, 0);
      const netWorth = totalAssets - totalDebts;
      const goalsSummary =
        goals
          .map(g => {
            let currentAmountForDisplay = g.currentAmount;
            if (g.name.toLowerCase().includes('retirement')) {
              const retirementAssetsTotal = assets
                .filter(isRetirementAsset)
                .reduce((sum, asset) => sum + asset.balance, 0);
              currentAmountForDisplay = retirementAssetsTotal;
            }
            return `- ${g.name}: $${currentAmountForDisplay.toLocaleString()} of $${g.targetAmount.toLocaleString()}`;
          })
          .join('\n') || 'No goals provided.';

      const summary = `Here is a quick snapshot of your finances:\nTotal Assets: $${totalAssets.toLocaleString()}\nTotal Debts: $${totalDebts.toLocaleString()}\nNet Worth: $${netWorth.toLocaleString()}\n\nGoals:\n${goalsSummary}`;

      return res.status(200).json({ success: true, data: { message: summary } });
    }

    const systemPrompt = `You are PocketFA, a friendly and helpful AI financial assistant.
A user is asking for financial advice. Here is their current financial situation:

User Profile:
- Age: ${user?.profile?.age || 'Not specified'}
- Retirement Age Goal: ${user?.profile?.retirementAge || 'Not specified'}
- Risk Tolerance: ${user?.profile?.riskTolerance || 'Not specified'}
- Savings Rate (% of income): ${user?.profile?.savingsRate || 'Not specified'}
- Financial Knowledge: ${user?.profile?.financialKnowledge || 'Not specified'}

Assets:
${assets.map(a => `- ${a.type}: $${a.balance.toLocaleString()} (Interest/Growth Rate: ${a.interestRate || 'N/A'}%)`).join('\n') || 'No assets specified.'}
Total Assets: $${assets.reduce((sum, asset) => sum + asset.balance, 0).toLocaleString()}

Debts:
${debts.map(d => `- ${d.type} (${d.lender}): $${d.balance.toLocaleString()} (Interest Rate: ${d.interestRate.toFixed(2)}%, Monthly Payment: $${d.monthlyPayment.toLocaleString()})`).join('\n') || 'No debts specified.'}
Total Debts: $${debts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString()}

Financial Goals:
${goals.map(g => `- ${g.name}: Target $${g.targetAmount.toLocaleString()}, Current $${g.currentAmount.toLocaleString()} (Target Date: ${g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'N/A'}, Priority: ${g.priority})`).join('\n') || 'No goals specified.'}

`;

    const historyForAI = clientHistory.map((msg: { sender: string; text: string }) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = startChat([
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: "Understood. I have the user's financial context. I'm ready to help." }] },
      ...historyForAI,
    ]);

    console.log('Gemini system prompt:', systemPrompt);
    console.log('Prompt length:', systemPrompt.length);

    const finalMessage = await sendMessage(chat, userQuery);

    return res.status(200).json({ success: true, data: { message: finalMessage } });

  } catch (error: any) {
    console.error('Gemini API or Chat error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    let errorMessage = 'Failed to process chat message with AI.';
    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
    // Check for specific Gemini API errors if the SDK provides them
    // For example, if (error instanceof GoogleGenerativeAIError) { ... }
    return res.status(500).json({ success: false, error: errorMessage });
  }
});