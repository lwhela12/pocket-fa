import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '../../../lib/api-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chatContexts } from '../chat/create-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await authenticate(req);
    const { recordType } = req.query;
    const { contextId, message } = req.body;

    if (!contextId || !message) {
      return res.status(400).json({ error: 'Context ID and message are required' });
    }

    // Get context from store
    const context = chatContexts.get(contextId);
    if (!context || context.userId !== userId) {
      return res.status(404).json({ error: 'Context not found or unauthorized' });
    }

    const record = context.data;

    // Build prompt based on record type
    let prompt = '';
    if (recordType === 'asset') {
      prompt = `You are a financial advisor reviewing an asset. Here is the asset information:

Type: ${record.type}
Subtype: ${record.subtype || 'N/A'}
Name: ${record.name}
Balance: $${record.balance?.toLocaleString()}
${record.interestRate ? `Interest Rate: ${record.interestRate}%` : ''}
${record.growthRate ? `Growth Rate: ${record.growthRate}%` : ''}
${record.annualContribution ? `Annual Contribution: $${record.annualContribution.toLocaleString()}` : ''}
${record.assetClass ? `Asset Class: ${record.assetClass}` : ''}

User's question: ${message}

Provide helpful, personalized financial advice about this asset. Be specific and actionable. Keep your response concise (2-3 paragraphs).`;
    } else if (recordType === 'debt') {
      prompt = `You are a financial advisor reviewing a debt. Here is the debt information:

Type: ${record.type}
Lender: ${record.lender}
Balance: $${record.balance?.toLocaleString()}
Interest Rate: ${record.interestRate}%
Monthly Payment: $${record.monthlyPayment?.toLocaleString()}
${record.termLength ? `Term Length: ${Math.round(record.termLength / 12)} years (${record.termLength} months)` : 'Revolving'}

User's question: ${message}

Provide helpful, personalized financial advice about this debt. Be specific and actionable. Keep your response concise (2-3 paragraphs).`;
    }

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContentStream(prompt);

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    for await (const chunk of result.stream) {
      const text = chunk.text();
      res.write(`data: ${text}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('Error in review endpoint:', error);
    res.status(500).json({ error: 'Failed to generate review' });
  }
}
