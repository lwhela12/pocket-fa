import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { Statement } from '@prisma/client';

export default createApiHandler<Statement[]>(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<Statement[]>>) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);

  const statements = await prisma.statement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, data: statements });
});
