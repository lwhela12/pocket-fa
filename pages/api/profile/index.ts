import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

type ProfileResponse = {
  id: string;
  age: number | null;
  retirementAge: number | null;
  riskTolerance: string | null;
  inflationRate: number | null;
  investmentReturn: number | null;
  savingsRate: number | null;
};

export default createApiHandler<ProfileResponse>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ProfileResponse>>
) => {
  try {
    // Authenticate user
    const userId = await authenticate(req);

    if (req.method === 'GET') {
      // Get user profile
      const profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found' });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          age: profile.age,
          retirementAge: profile.retirementAge,
          riskTolerance: profile.riskTolerance,
          inflationRate: profile.inflationRate,
          investmentReturn: profile.investmentReturn,
          savingsRate: profile.savingsRate,
        },
      });
    } else if (req.method === 'POST' || req.method === 'PUT') {
      // Create or update profile
      const { age, retirementAge, riskTolerance, inflationRate, investmentReturn, savingsRate } = req.body;

      // Validate input
      if (age && (age < 18 || age > 100)) {
        return res.status(400).json({ success: false, error: 'Age must be between 18 and 100' });
      }

      if (retirementAge && (retirementAge < 40 || retirementAge > 80)) {
        return res.status(400).json({ success: false, error: 'Retirement age must be between 40 and 80' });
      }

      if (riskTolerance && !['Conservative', 'Moderate', 'Aggressive'].includes(riskTolerance)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Risk tolerance must be "Conservative", "Moderate", or "Aggressive"'
        });
      }

      // Check if profile exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      let profile;

      if (existingProfile) {
        // Update existing profile
        profile = await prisma.profile.update({
          where: { userId },
          data: {
            age: age !== undefined ? age : existingProfile.age,
            retirementAge: retirementAge !== undefined ? retirementAge : existingProfile.retirementAge,
            riskTolerance: riskTolerance !== undefined ? riskTolerance : existingProfile.riskTolerance,
            inflationRate: inflationRate !== undefined ? inflationRate : existingProfile.inflationRate,
            investmentReturn: investmentReturn !== undefined ? investmentReturn : existingProfile.investmentReturn,
            savingsRate: savingsRate !== undefined ? savingsRate : existingProfile.savingsRate,
          },
        });
      } else {
        // Create new profile
        profile = await prisma.profile.create({
          data: {
            userId,
            age,
            retirementAge,
            riskTolerance,
            inflationRate,
            investmentReturn,
            savingsRate,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          age: profile.age,
          retirementAge: profile.retirementAge,
          riskTolerance: profile.riskTolerance,
          inflationRate: profile.inflationRate,
          investmentReturn: profile.investmentReturn,
          savingsRate: profile.savingsRate,
        },
      });
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process profile request' });
  }
});