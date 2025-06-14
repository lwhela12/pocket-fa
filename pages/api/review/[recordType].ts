import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { startChat, sendMessageStream } from '../../../lib/gemini-service';
import { getContext } from '../../../lib/context-cache';
import { storeChatSession, getChatSession } from '../../../lib/chat-session-cache';


export default createApiHandler<void>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<void>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  await authenticate(req);

  const { contextId, message } = req.body as {
    contextId?: string;
    message?: string;
  };
  console.log('🕵️‍♂️ Review API called. Request body:', JSON.stringify(req.body));

  if (!contextId) {
    return res.status(400).json({ success: false, error: 'contextId is required' });
  }

  const context = getContext(contextId);
  if (!context) {
    return res.status(400).json({ success: false, error: 'Invalid contextId' });
  }

  let session = getChatSession(contextId);
  if (!session) {
    const systemPrompt = `You are a smart and friendly financial advisor who helps users understand their statements. You are well versed in Modern Portfolio Theory, Asset Allocation, Diverisification and risk management. You provide clients with clear down to earth explanations of their statments and help them identify how to optimize their portfolios.Here is the statement data:\n\n${JSON.stringify(
      context,
      null,
      2
    )}`;
    session = startChat([{ role: 'user', parts: [{ text: systemPrompt }] }]);
    storeChatSession(contextId, session);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });

  const stream = await sendMessageStream(session, message!);
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) {
      res.write(`data: ${text}\n\n`);
    }
  }
  res.end();

});
