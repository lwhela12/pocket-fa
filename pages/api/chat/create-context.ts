import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { storeContext } from '../../../lib/context-cache';

export default createApiHandler<string>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<string>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  await authenticate(req);

  const { data } = req.body as { data?: any };
  if (!data) {
    return res.status(400).json({ success: false, error: 'Missing data' });
  }

  const id = storeContext(data);
  return res.status(200).json({ success: true, data: id });
});
