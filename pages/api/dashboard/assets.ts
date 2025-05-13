import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { randomUUID } from 'crypto';

type Asset = {
  id: string;
  userId: string;
  type: string;
  subtype: string | null;
  name: string;
  balance: number;
  interestRate: number | null;
  annualContribution: number | null;
  growthRate: number | null;
  assetClass: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Mock assets for development
let mockAssets: Asset[] = [
  {
    id: '1',
    userId: '123',
    type: 'Cash',
    subtype: 'Checking',
    name: 'Main Checking Account',
    balance: 10000,
    interestRate: 0.01,
    annualContribution: 1200,
    growthRate: null,
    assetClass: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: '123',
    type: 'Investment',
    subtype: '401(k)',
    name: 'Employer 401(k)',
    balance: 50000,
    interestRate: null,
    annualContribution: 6000,
    growthRate: 7,
    assetClass: 'Mixed',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default createApiHandler<Asset | Asset[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Asset | Asset[]>>
) => {
  try {
    // Authenticate user
    const userId = await authenticate(req);
    
    // Development mode uses mock data
    const isDev = process.env.NODE_ENV === 'development';
    
    // Handle GET request
    if (req.method === 'GET') {
      // Check if we're getting a single asset or all assets
      const { id } = req.query;
      
      if (id) {
        // Get single asset
        if (isDev) {
          const asset = mockAssets.find(a => a.id === id && a.userId === userId);
          if (!asset) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
          }
          return res.status(200).json({ success: true, data: asset });
        } else {
          // Production mode using Prisma
          try {
            const asset = await prisma.asset.findUnique({
              where: { id: id as string },
            });
            
            if (!asset || asset.userId !== userId) {
              return res.status(404).json({ success: false, error: 'Asset not found' });
            }
            
            return res.status(200).json({
              success: true,
              data: asset,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve asset' });
          }
        }
      } else {
        // Get all assets
        if (isDev) {
          const userAssets = mockAssets.filter(a => a.userId === userId);
          return res.status(200).json({ success: true, data: userAssets });
        } else {
          // Production mode using Prisma
          try {
            const assets = await prisma.asset.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
            });
            
            return res.status(200).json({
              success: true,
              data: assets,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve assets' });
          }
        }
      }
    }
    
    // Handle POST request (create asset)
    if (req.method === 'POST') {
      const { 
        type, 
        subtype, 
        name, 
        balance, 
        interestRate, 
        annualContribution, 
        growthRate, 
        assetClass 
      } = req.body;
      
      // Validate required fields
      if (!type || !name || balance === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Type, name, and balance are required' 
        });
      }
      
      // Create asset
      if (isDev) {
        const newAsset: Asset = {
          id: randomUUID(),
          userId,
          type,
          subtype: subtype || null,
          name,
          balance: parseFloat(balance),
          interestRate: interestRate ? parseFloat(interestRate) : null,
          annualContribution: annualContribution ? parseFloat(annualContribution) : null,
          growthRate: growthRate ? parseFloat(growthRate) : null,
          assetClass: assetClass || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        mockAssets.push(newAsset);
        return res.status(201).json({ success: true, data: newAsset });
      } else {
        // Production mode using Prisma
        try {
          const asset = await prisma.asset.create({
            data: {
              userId,
              type,
              subtype,
              name,
              balance,
              interestRate,
              annualContribution,
              growthRate,
              assetClass,
            },
          });
          
          return res.status(201).json({
            success: true,
            data: asset,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to create asset' });
        }
      }
    }
    
    // Handle PUT request (update asset)
    if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Asset ID is required' });
      }
      
      if (isDev) {
        // Check if asset exists and belongs to user
        const assetIndex = mockAssets.findIndex(a => a.id === id && a.userId === userId);
        if (assetIndex === -1) {
          return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        const existingAsset = mockAssets[assetIndex];
        const { 
          type, 
          subtype, 
          name, 
          balance, 
          interestRate, 
          annualContribution, 
          growthRate, 
          assetClass 
        } = req.body;
        
        // Update asset
        const updatedAsset = {
          ...existingAsset,
          type: type !== undefined ? type : existingAsset.type,
          subtype: subtype !== undefined ? subtype : existingAsset.subtype,
          name: name !== undefined ? name : existingAsset.name,
          balance: balance !== undefined ? parseFloat(balance) : existingAsset.balance,
          interestRate: interestRate !== undefined ? parseFloat(interestRate) : existingAsset.interestRate,
          annualContribution: annualContribution !== undefined ? parseFloat(annualContribution) : existingAsset.annualContribution,
          growthRate: growthRate !== undefined ? parseFloat(growthRate) : existingAsset.growthRate,
          assetClass: assetClass !== undefined ? assetClass : existingAsset.assetClass,
          updatedAt: new Date()
        };
        
        mockAssets[assetIndex] = updatedAsset;
        return res.status(200).json({ success: true, data: updatedAsset });
      } else {
        // Production mode using Prisma
        try {
          // Check if asset exists and belongs to user
          const existingAsset = await prisma.asset.findUnique({
            where: { id: id as string },
          });
          
          if (!existingAsset || existingAsset.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
          }
          
          const { 
            type, 
            subtype, 
            name, 
            balance, 
            interestRate, 
            annualContribution, 
            growthRate, 
            assetClass 
          } = req.body;
          
          // Update asset
          const asset = await prisma.asset.update({
            where: { id: id as string },
            data: {
              type: type !== undefined ? type : existingAsset.type,
              subtype: subtype !== undefined ? subtype : existingAsset.subtype,
              name: name !== undefined ? name : existingAsset.name,
              balance: balance !== undefined ? balance : existingAsset.balance,
              interestRate: interestRate !== undefined ? interestRate : existingAsset.interestRate,
              annualContribution: annualContribution !== undefined ? annualContribution : existingAsset.annualContribution,
              growthRate: growthRate !== undefined ? growthRate : existingAsset.growthRate,
              assetClass: assetClass !== undefined ? assetClass : existingAsset.assetClass,
            },
          });
          
          return res.status(200).json({
            success: true,
            data: asset,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to update asset' });
        }
      }
    }
    
    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Asset ID is required' });
      }
      
      if (isDev) {
        // Check if asset exists and belongs to user
        const assetIndex = mockAssets.findIndex(a => a.id === id && a.userId === userId);
        if (assetIndex === -1) {
          return res.status(404).json({ success: false, error: 'Asset not found' });
        }
        
        // Delete asset
        mockAssets = mockAssets.filter((_, index) => index !== assetIndex);
        return res.status(200).json({ success: true, data: { id: id as string } });
      } else {
        // Production mode using Prisma
        try {
          // Check if asset exists and belongs to user
          const existingAsset = await prisma.asset.findUnique({
            where: { id: id as string },
          });
          
          if (!existingAsset || existingAsset.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Asset not found' });
          }
          
          // Delete asset
          await prisma.asset.delete({
            where: { id: id as string },
          });
          
          return res.status(200).json({
            success: true,
            data: { id: id as string },
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to delete asset' });
        }
      }
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Assets API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process assets request' });
  }
});