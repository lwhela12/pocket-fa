import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import { sendWelcomeEmail } from '../../../lib/email';
import prisma from '../../../lib/prisma';

type VerifyEmailResponse = {
  message: string;
  redirectUrl?: string;
};

export default createApiHandler<VerifyEmailResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<VerifyEmailResponse>>
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, error: 'Verification token is required' });
  }

  try {
    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'Email already verified! You can log in now.',
          redirectUrl: '/auth/login',
        },
      });
    }

    // Check if token has expired
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired. Please request a new one.',
      });
    }

    // Mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // Redirect to login page or return success message
    return res.status(200).json({
      success: true,
      data: {
        message: 'Email verified successfully! You can now log in.',
        redirectUrl: '/auth/login',
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
});
