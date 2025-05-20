import type { NextApiRequest, NextApiResponse } from 'next';
import { sign } from 'jsonwebtoken';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import speakeasy from 'speakeasy';

type VerifyMFAResponse = {
  token: string;
  refreshToken: string;
};

export default createApiHandler<VerifyMFAResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<VerifyMFAResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { userId, code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ success: false, error: 'User ID and verification code are required' });
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled) {
      return res.status(401).json({ success: false, error: 'Invalid user or MFA not enabled' });
    }

    let isValid = false;
    if (user.mfaType === 'app' && user.mfaSecret) {
      isValid = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: code });
    } else if (user.mfaType === 'sms') {
      // TODO: integrate real SMS code verification via provider
      isValid = code === '123456';
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid verification code' });
    }

    // Create JWT token
    const secret = process.env.JWT_SECRET || '';
    const token = sign({ id: user.id }, secret, { expiresIn: '30m' });
    
    // Create refresh token (in a real app, this would be stored in the database)
    const refreshToken = sign({ id: user.id }, secret, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify MFA code' });
  }
});