import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { clearContext } from '../../../lib/context-cache';
import { clearChatSession } from '../../../lib/chat-session-cache';

export default createApiHandler<void>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<void>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  await authenticate(req);

  const { contextId } = req.body as { contextId?: string };
  if (!contextId) {
    return res.status(400).json({ success: false, error: 'contextId is required' });
  }

  clearContext(contextId);
  clearChatSession(contextId);

  return res.status(200).json({ success: true });
});
