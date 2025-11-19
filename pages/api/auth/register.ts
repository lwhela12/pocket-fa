import type { NextApiRequest, NextApiResponse } from 'next';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import { checkRateLimit, authRateLimiter } from '../../../lib/rate-limit';
import { sendVerificationEmail } from '../../../lib/email';
import prisma from '../../../lib/prisma';

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
  message: string;
};

export default createApiHandler<RegisterResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RegisterResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Apply rate limiting to prevent spam registrations
  const rateLimitPassed = await checkRateLimit(req, res, authRateLimiter);
  if (!rateLimitPassed) {
    return; // Response already sent by checkRateLimit
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  if (password.length < 12) {
    return res.status(400).json({ success: false, error: 'Password must be at least 12 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Hash password using argon2 (salt handled automatically)
    const hashedPassword = await argon2.hash(password);

    // Generate verification token (32 bytes = 64 hex characters)
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours from now

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails, user can resend
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        message: 'Registration successful! Please check your email to verify your account.',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Failed to register user' });
  }
});