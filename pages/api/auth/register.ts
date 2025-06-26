import type { NextApiRequest, NextApiResponse } from 'next';
import * as argon2 from 'argon2-browser';
import { sign } from 'jsonwebtoken';
import { createApiHandler, ApiResponse } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { randomBytes } from 'crypto';
import { ensureArgon2Wasm } from '../../../lib/argon2-wasm';

type RegisterResponse = {
  user: {
    id: string;
    email: string;
  };
  token: string;
};

export default createApiHandler<RegisterResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RegisterResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

    // Ensure the WASM loader is set for argon2-browser
    await ensureArgon2Wasm();

    // Hash password using argon2-browser with a random salt
    const salt = randomBytes(16);
    const hashResult = await argon2.hash({
        pass: password,
        salt: salt,
        type: argon2.ArgonType.Argon2id,
    });
    const hashedPassword = hashResult.hashHex;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Create JWT token
    const secret = process.env.JWT_SECRET || '';
    const token = sign({ id: user.id }, secret, { expiresIn: '30m' });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, error: 'Failed to register user' });
  }
});