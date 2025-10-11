import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { randomUUID } from 'crypto';

// Simple in-memory store for chat contexts
// In production, you'd want to use Redis or database
const chatContexts = new Map<string, { userId: string; data: any; createdAt: Date }>();

// Clean up old contexts (older than 1 hour)
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, context] of chatContexts.entries()) {
    if (context.createdAt < oneHourAgo) {
      chatContexts.delete(id);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

export default createApiHandler<string>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<string>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);
  const { data } = req.body;

  if (!data) {
    return res.status(400).json({ success: false, error: 'Data is required' });
  }

  // Create a unique context ID
  const contextId = randomUUID();

  // Store the context
  chatContexts.set(contextId, {
    userId,
    data,
    createdAt: new Date(),
  });

  return res.status(200).json({ success: true, data: contextId });
});

// Export the contexts map so it can be used by other endpoints
export { chatContexts };
