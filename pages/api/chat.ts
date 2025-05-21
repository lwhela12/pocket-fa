import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import prisma from '../../lib/prisma';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

type ChatResponse = {
  message: string;
};

const MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Or your preferred Gemini model
const API_KEY = process.env.GEMINI_API_KEY;

export default createApiHandler<ChatResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ChatResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!API_KEY) {
    console.error('GEMINI_API_KEY is not set.');
    return res.status(500).json({ success: false, error: 'AI service is not configured.' });
  }

  try {
    const userId = await authenticate(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { message: userQuery } = req.body;

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
      const goalsSummary = goals
        .map(g => `- ${g.name}: $${g.currentAmount.toLocaleString()} of $${g.targetAmount.toLocaleString()}`)
        .join('\n') || 'No goals provided.';

      const summary = `Here is a quick snapshot of your finances:\nTotal Assets: $${totalAssets.toLocaleString()}\nTotal Debts: $${totalDebts.toLocaleString()}\nNet Worth: $${netWorth.toLocaleString()}\n\nGoals:\n${goalsSummary}`;

      return res.status(200).json({ success: true, data: { message: summary } });
    }

    // Construct a detailed prompt for Gemini
    let prompt = `You are PocketFA, a friendly and helpful AI financial assistant.
A user is asking for financial advice. Here is their current financial situation:

User Profile:
- Age: ${user?.profile?.age || 'Not specified'}
- Retirement Age Goal: ${user?.profile?.retirementAge || 'Not specified'}
- Risk Tolerance: ${user?.profile?.riskTolerance || 'Not specified'}
- Savings Rate (% of income): ${user?.profile?.savingsRate || 'Not specified'}
- Financial Knowledge: ${user?.profile?.financialKnowledge || 'Not specified'}

Assets (top 5 by value):
${assets.slice(0, 5).map(a => `- ${a.type}: $${a.balance.toLocaleString()} (Interest/Growth Rate: ${a.interestRate || 'N/A'}%)`).join('\n') || 'No assets specified.'}
Total Assets: $${assets.reduce((sum, asset) => sum + asset.balance, 0).toLocaleString()}

Debts (top 5 by value):
${debts.slice(0, 5).map(d => `- ${d.type} (${d.lender}): $${d.balance.toLocaleString()} (Interest Rate: ${d.interestRate.toFixed(2)}%, Monthly Payment: $${d.monthlyPayment.toLocaleString()})`).join('\n') || 'No debts specified.'}
Total Debts: $${debts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString()}

Financial Goals (top 3 by priority):
${goals.slice(0, 3).map(g => `- ${g.name}: Target $${g.targetAmount.toLocaleString()}, Current $${g.currentAmount.toLocaleString()} (Target Date: ${g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'N/A'}, Priority: ${g.priority})`).join('\n') || 'No goals specified.'}

User's question: "${userQuery}"

Based on this information, provide a concise, helpful, and personalized response.
If the user asks about something not covered by their provided data (e.g., specific stock advice if they haven't listed stocks), gently guide them to provide more information or state that you can't answer without it.
Do not give specific investment advice (e.g., "buy X stock"). Focus on general strategies, education, and using their provided data.
Keep your response to a few paragraphs.
Response:
`;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.7, // Adjust for creativity vs. factuality
      topK: 1,
      topP: 1,
      maxOutputTokens: 512, // Adjust as needed
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];
    
    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [ // You can build up chat history here if needed for multi-turn conversations
            // { role: "user", parts: [{ text: "Previous user query" }] },
            // { role: "model", parts: [{ text: "Previous AI response" }] },
        ]
    });

    const result = await chat.sendMessage(prompt); // Send the full context as the first message in a new chat
    const aiResponseText = result.response.text();

    return res.status(200).json({
      success: true,
      data: {
        message: aiResponseText,
      },
    });

  } catch (error: any) {
    console.error('Gemini API or Chat error:', error);
    let errorMessage = 'Failed to process chat message with AI.';
    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
    // Check for specific Gemini API errors if the SDK provides them
    // For example, if (error instanceof GoogleGenerativeAIError) { ... }
    return res.status(500).json({ success: false, error: errorMessage });
  }
});