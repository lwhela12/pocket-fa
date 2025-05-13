import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { randomUUID } from 'crypto';

type Debt = {
  id: string;
  userId: string;
  type: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termLength: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Mock debts for development
let mockDebts: Debt[] = [
  {
    id: '1',
    userId: '123',
    type: 'Mortgage',
    lender: 'First Bank',
    balance: 250000,
    interestRate: 3.5,
    monthlyPayment: 1200,
    termLength: 360,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: '123',
    type: 'Credit Card',
    lender: 'Chase',
    balance: 3500,
    interestRate: 18.99,
    monthlyPayment: 150,
    termLength: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default createApiHandler<Debt | Debt[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Debt | Debt[]>>
) => {
  try {
    // Authenticate user
    const userId = await authenticate(req);
    
    // Development mode uses mock data
    const isDev = process.env.NODE_ENV === 'development';
    
    // Handle GET request
    if (req.method === 'GET') {
      // Check if we're getting a single debt or all debts
      const { id } = req.query;
      
      if (id) {
        // Get single debt
        if (isDev) {
          const debt = mockDebts.find(d => d.id === id && d.userId === userId);
          if (!debt) {
            return res.status(404).json({ success: false, error: 'Debt not found' });
          }
          return res.status(200).json({ success: true, data: debt });
        } else {
          // Production mode using Prisma
          try {
            const debt = await prisma.debt.findUnique({
              where: { id: id as string },
            });
            
            if (!debt || debt.userId !== userId) {
              return res.status(404).json({ success: false, error: 'Debt not found' });
            }
            
            return res.status(200).json({
              success: true,
              data: debt,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve debt' });
          }
        }
      } else {
        // Get all debts
        if (isDev) {
          const userDebts = mockDebts.filter(d => d.userId === userId);
          return res.status(200).json({ success: true, data: userDebts });
        } else {
          // Production mode using Prisma
          try {
            const debts = await prisma.debt.findMany({
              where: { userId },
              orderBy: { createdAt: 'desc' },
            });
            
            return res.status(200).json({
              success: true,
              data: debts,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve debts' });
          }
        }
      }
    }
    
    // Handle POST request (create debt)
    if (req.method === 'POST') {
      const { 
        type, 
        lender, 
        balance, 
        interestRate, 
        monthlyPayment, 
        termLength 
      } = req.body;
      
      // Validate required fields
      if (!type || !lender || balance === undefined || interestRate === undefined || monthlyPayment === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Type, lender, balance, interest rate, and monthly payment are required' 
        });
      }
      
      // Create debt
      if (isDev) {
        const newDebt: Debt = {
          id: randomUUID(),
          userId,
          type,
          lender,
          balance: parseFloat(balance),
          interestRate: parseFloat(interestRate),
          monthlyPayment: parseFloat(monthlyPayment),
          termLength: termLength ? parseInt(termLength, 10) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        mockDebts.push(newDebt);
        return res.status(201).json({ success: true, data: newDebt });
      } else {
        // Production mode using Prisma
        try {
          const debt = await prisma.debt.create({
            data: {
              userId,
              type,
              lender,
              balance,
              interestRate,
              monthlyPayment,
              termLength,
            },
          });
          
          return res.status(201).json({
            success: true,
            data: debt,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to create debt' });
        }
      }
    }
    
    // Handle PUT request (update debt)
    if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Debt ID is required' });
      }
      
      if (isDev) {
        // Check if debt exists and belongs to user
        const debtIndex = mockDebts.findIndex(d => d.id === id && d.userId === userId);
        if (debtIndex === -1) {
          return res.status(404).json({ success: false, error: 'Debt not found' });
        }
        
        const existingDebt = mockDebts[debtIndex];
        const { 
          type, 
          lender, 
          balance, 
          interestRate, 
          monthlyPayment, 
          termLength 
        } = req.body;
        
        // Update debt
        const updatedDebt = {
          ...existingDebt,
          type: type !== undefined ? type : existingDebt.type,
          lender: lender !== undefined ? lender : existingDebt.lender,
          balance: balance !== undefined ? parseFloat(balance) : existingDebt.balance,
          interestRate: interestRate !== undefined ? parseFloat(interestRate) : existingDebt.interestRate,
          monthlyPayment: monthlyPayment !== undefined ? parseFloat(monthlyPayment) : existingDebt.monthlyPayment,
          termLength: termLength !== undefined ? parseInt(termLength, 10) : existingDebt.termLength,
          updatedAt: new Date()
        };
        
        mockDebts[debtIndex] = updatedDebt;
        return res.status(200).json({ success: true, data: updatedDebt });
      } else {
        // Production mode using Prisma
        try {
          // Check if debt exists and belongs to user
          const existingDebt = await prisma.debt.findUnique({
            where: { id: id as string },
          });
          
          if (!existingDebt || existingDebt.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Debt not found' });
          }
          
          const { 
            type, 
            lender, 
            balance, 
            interestRate, 
            monthlyPayment, 
            termLength 
          } = req.body;
          
          // Update debt
          const debt = await prisma.debt.update({
            where: { id: id as string },
            data: {
              type: type !== undefined ? type : existingDebt.type,
              lender: lender !== undefined ? lender : existingDebt.lender,
              balance: balance !== undefined ? balance : existingDebt.balance,
              interestRate: interestRate !== undefined ? interestRate : existingDebt.interestRate,
              monthlyPayment: monthlyPayment !== undefined ? monthlyPayment : existingDebt.monthlyPayment,
              termLength: termLength !== undefined ? termLength : existingDebt.termLength,
            },
          });
          
          return res.status(200).json({
            success: true,
            data: debt,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to update debt' });
        }
      }
    }
    
    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Debt ID is required' });
      }
      
      if (isDev) {
        // Check if debt exists and belongs to user
        const debtIndex = mockDebts.findIndex(d => d.id === id && d.userId === userId);
        if (debtIndex === -1) {
          return res.status(404).json({ success: false, error: 'Debt not found' });
        }
        
        // Delete debt
        mockDebts = mockDebts.filter((_, index) => index !== debtIndex);
        return res.status(200).json({ success: true, data: { id: id as string } });
      } else {
        // Production mode using Prisma
        try {
          // Check if debt exists and belongs to user
          const existingDebt = await prisma.debt.findUnique({
            where: { id: id as string },
          });
          
          if (!existingDebt || existingDebt.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Debt not found' });
          }
          
          // Delete debt
          await prisma.debt.delete({
            where: { id: id as string },
          });
          
          return res.status(200).json({
            success: true,
            data: { id: id as string },
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to delete debt' });
        }
      }
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Debts API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process debts request' });
  }
});