import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { checkRateLimit, authRateLimiter } from '../../../lib/rate-limit';
import { sendVerificationEmail } from '../../../lib/email';
import prisma from '../../../lib/prisma';

type ResendVerificationResponse = {
  message: string;
};

export default createApiHandler<ResendVerificationResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ResendVerificationResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting to prevent abuse (reuse auth rate limiter)
  const rateLimitPassed = await checkRateLimit(req, res, authRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
  }

  try {
    // Get user ID from auth token
    const userId = await authenticate(req);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours from now

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Verification email sent! Please check your inbox.',
      },
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resend verification email' });
  }
});
