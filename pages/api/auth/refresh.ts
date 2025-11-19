import type { NextApiRequest, NextApiResponse } from 'next';
import { sign, verify } from 'jsonwebtoken';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import { checkRateLimit, authRateLimiter } from '../../../lib/rate-limit';
import prisma from '../../../lib/prisma';

type RefreshResponse = {
  token: string;
  refreshToken: string;
};

export default createApiHandler<RefreshResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefreshResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting to prevent refresh token abuse
  const rateLimitPassed = await checkRateLimit(req, res, authRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token is required' });
  }

  try {
    // Find the refresh token in the database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Check if token has been revoked
    if (tokenRecord.revokedAt) {
      return res.status(401).json({ success: false, error: 'Refresh token has been revoked' });
    }

    // Check if token has expired
    if (tokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      return res.status(401).json({ success: false, error: 'Refresh token has expired' });
    }

    // Verify the JWT signature
    const secret = process.env.JWT_SECRET || '';
    try {
      verify(refreshToken, secret);
    } catch (error) {
      // Token signature is invalid, revoke it
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      return res.status(401).json({ success: false, error: 'Invalid refresh token signature' });
    }

    // Generate new access token
    const newToken = sign({ id: tokenRecord.userId }, secret, { expiresIn: '30m' });

    // Generate new refresh token and revoke the old one (token rotation)
    const newRefreshToken = sign({ id: tokenRecord.userId }, secret, { expiresIn: '7d' });
    const newRefreshTokenExpiry = new Date();
    newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7);

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Create new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        token: newRefreshToken,
        expiresAt: newRefreshTokenExpiry,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});
