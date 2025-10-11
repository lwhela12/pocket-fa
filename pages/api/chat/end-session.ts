import type { NextApiRequest, NextApiResponse } from 'next';
import { chatContexts } from './create-context';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contextId } = req.body;

    if (contextId && chatContexts.has(contextId)) {
      chatContexts.delete(contextId);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
}
