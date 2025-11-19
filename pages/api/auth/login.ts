import type { NextApiRequest, NextApiResponse } from 'next';
import * as argon2 from 'argon2';
import { sign } from 'jsonwebtoken';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import { checkRateLimit, authRateLimiter } from '../../../lib/rate-limit';
import prisma from '../../../lib/prisma';

type LoginResponse = {
  user: {
    id: string;
    email: string;
    mfaEnabled: boolean;
  };
  token: string;
  refreshToken?: string;
};

export default createApiHandler<LoginResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<LoginResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting to prevent brute force attacks
  const rateLimitPassed = await checkRateLimit(req, res, authRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Verify password using argon2
    const isPasswordValid = await argon2.verify(user.password, password);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
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
        user: {
          id: user.id,
          email: user.email,
          mfaEnabled: user.mfaEnabled,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Failed to log in' });
  }
});