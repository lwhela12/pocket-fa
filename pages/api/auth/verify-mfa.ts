import type { NextApiRequest, NextApiResponse } from 'next';
import { sign } from 'jsonwebtoken';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import { checkRateLimit, authRateLimiter } from '../../../lib/rate-limit';
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

  // Apply rate limiting to prevent MFA brute force attacks
  const rateLimitPassed = await checkRateLimit(req, res, authRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
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

    // Only app-based TOTP MFA is currently supported
    // SMS MFA requires integration with Twilio, AWS SNS, or similar provider
    if (user.mfaType !== 'app' || !user.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA configuration. Please reconfigure MFA.'
      });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code
    });

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid verification code' });
    }

    // Create JWT token
    const secret = process.env.JWT_SECRET || '';
    const token = sign({ id: user.id }, secret, { expiresIn: '30m' });

    // Create and store refresh token in database
    const refreshTokenValue = sign({ id: user.id }, secret, { expiresIn: '7d' });
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshTokenExpiry,
      },
    });

    const refreshToken = refreshTokenValue;

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