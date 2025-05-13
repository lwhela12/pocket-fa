import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

type MFASetupResponse = {
  success: boolean;
};

export default createApiHandler<MFASetupResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MFASetupResponse>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const userId = await authenticate(req);

    const { mfaType, phoneNumber, mfaSecret } = req.body;

    if (!mfaType || (mfaType === 'sms' && !phoneNumber) || (mfaType === 'app' && !mfaSecret)) {
      return res.status(400).json({ 
        success: false, 
        error: 'MFA type and corresponding details are required' 
      });
    }

    // Update user's MFA settings
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaType,
        phoneNumber: mfaType === 'sms' ? phoneNumber : null,
        mfaSecret: mfaType === 'app' ? mfaSecret : null,
      },
    });

    return res.status(200).json({
      success: true,
      data: { success: true },
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    return res.status(500).json({ success: false, error: 'Failed to set up MFA' });
  }
});