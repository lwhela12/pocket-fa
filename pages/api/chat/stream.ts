import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, authenticate } from '../../../lib/api-utils';
import { checkRateLimit, aiRateLimiter } from '../../../lib/rate-limit';
import { startChat, sendMessageStream } from '../../../lib/gemini-service';
import prisma from '../../../lib/prisma';
import { buildFinancialContext, formatFinancialContextForChat } from '../../../lib/financial-context-builder';

export default createApiHandler<void>(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);

  // Apply rate limiting to control AI API costs (20 requests per hour)
  const rateLimitPassed = await checkRateLimit(req, res, aiRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
  }
  const { message, history = [], statementId } = req.body as { message: string; history?: any[]; statementId?: string };

  // Build comprehensive financial context
  const financialContext = await buildFinancialContext(userId);
  const financialContextJson = formatFinancialContextForChat(financialContext);

  let systemPrompt: string;

  // Build base system prompt with comprehensive financial data
  systemPrompt = `You are PocketFA, a comprehensive financial advisor with access to the user's complete financial profile.

Here is the user's complete financial data:

\`\`\`json
${financialContextJson}
\`\`\`

This data includes:
- User profile (age, retirement plans, risk tolerance)
- Complete asset portfolio with balances and contribution details
- All debts/liabilities with payment schedules
- Financial goals with progress tracking
- Monthly expense breakdown and spending patterns
- Insurance coverage
- 30-year financial projections
- Current asset allocation

Use this data to provide personalized, actionable financial advice. When answering questions:
- Reference specific numbers from their actual financial data
- Provide context-aware recommendations based on their goals, risk tolerance, and current situation
- Suggest concrete action items when appropriate
- Be encouraging but realistic about their financial progress
`;

  // If reviewing a specific statement, add that context
  if (statementId) {
    const statement = await prisma.statement.findFirst({ where: { id: statementId, userId } });
    if (!statement || statement.status !== 'COMPLETED' || !statement.parsedData) {
      return res.status(404).json({ success: false, error: 'Statement not found or not processed.' });
    }
    systemPrompt += `\n\nThe user is currently reviewing a specific document from ${statement.brokerageCompany}. Here is the data extracted from it:\n\n${JSON.stringify(statement.parsedData, null, 2)}\n\nFocus on answering questions about this specific document while keeping their overall financial picture in mind.`;
  } else {
    // Add uploaded statements context if available
    const statements = await prisma.statement.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { fileName: true, brokerageCompany: true, parsedData: true },
    });

    if (statements.length > 0) {
      const fullPayload = statements.map(s => ({
        fileName: s.fileName,
        brokerageCompany: s.brokerageCompany,
        parsedData: s.parsedData,
      }));
      systemPrompt += `\n\nThe user has also uploaded ${statements.length} financial statement(s) with detailed portfolio data:\n\n\`\`\`json\n${JSON.stringify(fullPayload, null, 2)}\n\`\`\``;
    }
  }

  const aiHistory = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }],
  }));

  const chat = startChat([
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: "Understood. I have the user's financial context. How can I help?" }] },
    ...aiHistory,
  ]);

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });

  const stream = await sendMessageStream(chat, message);
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) {
      res.write(`data: ${JSON.stringify(text)}\n\n`);
    }
  }
  res.end();
});
