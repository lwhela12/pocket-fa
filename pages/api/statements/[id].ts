import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { Statement } from '@prisma/client';

export default createApiHandler<Statement>(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<Statement>>) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  const statement = await prisma.statement.findFirst({ where: { id, userId } });
  if (!statement) {
    return res.status(404).json({ success: false, error: 'Statement not found' });
  }

  res.status(200).json({ success: true, data: statement });
});
