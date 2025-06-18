import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, authenticate } from '../../../lib/api-utils';
import { startChat, sendMessageStream } from '../../../lib/gemini-service';
import prisma from '../../../lib/prisma';

export default createApiHandler<void>(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);
  const { message, history = [], statementId } = req.body as { message: string; history?: any[]; statementId?: string };

  let systemPrompt: string;

  if (statementId) {
    const statement = await prisma.statement.findFirst({ where: { id: statementId, userId } });
    if (!statement || statement.status !== 'COMPLETED' || !statement.parsedData) {
      return res.status(404).json({ success: false, error: 'Statement not found or not processed.' });
    }
    systemPrompt = `You are a financial advisor reviewing a specific document. The user has uploaded a statement from ${statement.brokerageCompany}. Here is the data extracted from it:\n\n${JSON.stringify(statement.parsedData, null, 2)}\n\nAnswer the user's questions about this document.`;
  } else {
    const statements = await prisma.statement.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { fileName: true, brokerageCompany: true, parsedData: true },
    });
    if (statements.length === 0) {
      systemPrompt = 'You are PocketFA, a helpful financial assistant. The user has not uploaded any statements yet. Politely ask them to upload a document to get started.';
    } else {
      const statementSummaries = statements
        .map(s => `- A statement from ${s.brokerageCompany} (${s.fileName}) containing data like: ${JSON.stringify((s.parsedData as any)?.accounts?.[0], null, 2)}`)
        .join('\n');
      systemPrompt = `You are PocketFA, a financial advisor. The user has uploaded the following statements for review:\n${statementSummaries}\n\nAnswer the user's questions based on the combined information from all these documents.`;
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
