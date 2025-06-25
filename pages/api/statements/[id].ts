import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { Statement } from '@prisma/client';

import fs from 'fs';
import path from 'path';

export default createApiHandler<Statement>(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<Statement>>) => {
  const userId = await authenticate(req);
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  if (req.method === 'DELETE') {
    const toDelete = await prisma.statement.findFirst({ where: { id, userId } });
    if (!toDelete) {
      return res.status(404).json({ success: false, error: 'Statement not found' });
    }
    await prisma.statement.delete({ where: { id } });
    const filePath = path.join(process.cwd(), 'public', 'statements', `${id}.pdf`);
    fs.promises.unlink(filePath).catch(() => {});
    return res.status(200).json({ success: true, data: toDelete });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const statement = await prisma.statement.findFirst({ where: { id, userId } });
  console.log('API GET /api/statements/:id parsedData:', JSON.stringify(statement?.parsedData, null, 2));

  if (!statement) {
    return res.status(404).json({ success: false, error: 'Statement not found' });
  }

  // Explicitly check if parsedData is missing
  if (!statement.parsedData) {
    return res.status(404).json({ 
      success: false, 
      error: 'Statement record found, but it has not been processed yet. Please try again in a moment.' 
    });
  }

  res.status(200).json({ success: true, data: statement });
});
