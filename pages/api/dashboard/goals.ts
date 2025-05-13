import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import { randomUUID } from 'crypto';

type FinancialGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};

// Mock goals for development
let mockGoals: FinancialGoal[] = [
  {
    id: '1',
    userId: '123',
    name: 'Emergency Fund',
    targetAmount: 15000,
    currentAmount: 5000,
    targetDate: new Date('2024-12-31'),
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: '123',
    name: 'Down Payment',
    targetAmount: 50000,
    currentAmount: 12000,
    targetDate: new Date('2026-06-30'),
    isActive: true,
    priority: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export default createApiHandler<FinancialGoal | FinancialGoal[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<FinancialGoal | FinancialGoal[]>>
) => {
  try {
    // Authenticate user
    const userId = await authenticate(req);
    
    // Development mode uses mock data
    const isDev = process.env.NODE_ENV === 'development';
    
    // Handle GET request
    if (req.method === 'GET') {
      // Check if we're getting a single goal or all goals
      const { id } = req.query;
      
      if (id) {
        // Get single goal
        if (isDev) {
          const goal = mockGoals.find(g => g.id === id && g.userId === userId);
          if (!goal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
          }
          return res.status(200).json({ success: true, data: goal });
        } else {
          // Production mode using Prisma
          try {
            const goal = await prisma.financialGoal.findUnique({
              where: { id: id as string },
            });
            
            if (!goal || goal.userId !== userId) {
              return res.status(404).json({ success: false, error: 'Goal not found' });
            }
            
            return res.status(200).json({
              success: true,
              data: goal,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve goal' });
          }
        }
      } else {
        // Get all goals
        if (isDev) {
          const userGoals = mockGoals.filter(g => g.userId === userId);
          return res.status(200).json({ success: true, data: userGoals });
        } else {
          // Production mode using Prisma
          try {
            const goals = await prisma.financialGoal.findMany({
              where: { userId },
              orderBy: { priority: 'asc' },
            });
            
            return res.status(200).json({
              success: true,
              data: goals,
            });
          } catch (error) {
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve goals' });
          }
        }
      }
    }
    
    // Handle POST request (create goal)
    if (req.method === 'POST') {
      const { 
        name, 
        targetAmount, 
        currentAmount, 
        targetDate, 
        isActive, 
        priority 
      } = req.body;
      
      // Validate required fields
      if (!name || targetAmount === undefined || currentAmount === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, target amount, and current amount are required' 
        });
      }
      
      // Create goal
      if (isDev) {
        const newGoal: FinancialGoal = {
          id: randomUUID(),
          userId,
          name,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount),
          targetDate: targetDate ? new Date(targetDate) : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          priority: priority !== undefined ? parseInt(priority, 10) : 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        mockGoals.push(newGoal);
        return res.status(201).json({ success: true, data: newGoal });
      } else {
        // Production mode using Prisma
        try {
          const goal = await prisma.financialGoal.create({
            data: {
              userId,
              name,
              targetAmount,
              currentAmount,
              targetDate: targetDate ? new Date(targetDate) : null,
              isActive: isActive !== undefined ? isActive : true,
              priority: priority || 1,
            },
          });
          
          return res.status(201).json({
            success: true,
            data: goal,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to create goal' });
        }
      }
    }
    
    // Handle PUT request (update goal)
    if (req.method === 'PUT') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Goal ID is required' });
      }
      
      if (isDev) {
        // Check if goal exists and belongs to user
        const goalIndex = mockGoals.findIndex(g => g.id === id && g.userId === userId);
        if (goalIndex === -1) {
          return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        const existingGoal = mockGoals[goalIndex];
        const { 
          name, 
          targetAmount, 
          currentAmount, 
          targetDate, 
          isActive, 
          priority 
        } = req.body;
        
        // Update goal
        const updatedGoal = {
          ...existingGoal,
          name: name !== undefined ? name : existingGoal.name,
          targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : existingGoal.targetAmount,
          currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : existingGoal.currentAmount,
          targetDate: targetDate !== undefined ? new Date(targetDate) : existingGoal.targetDate,
          isActive: isActive !== undefined ? Boolean(isActive) : existingGoal.isActive,
          priority: priority !== undefined ? parseInt(priority, 10) : existingGoal.priority,
          updatedAt: new Date()
        };
        
        mockGoals[goalIndex] = updatedGoal;
        return res.status(200).json({ success: true, data: updatedGoal });
      } else {
        // Production mode using Prisma
        try {
          // Check if goal exists and belongs to user
          const existingGoal = await prisma.financialGoal.findUnique({
            where: { id: id as string },
          });
          
          if (!existingGoal || existingGoal.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
          }
          
          const { 
            name, 
            targetAmount, 
            currentAmount, 
            targetDate, 
            isActive, 
            priority 
          } = req.body;
          
          // Update goal
          const goal = await prisma.financialGoal.update({
            where: { id: id as string },
            data: {
              name: name !== undefined ? name : existingGoal.name,
              targetAmount: targetAmount !== undefined ? targetAmount : existingGoal.targetAmount,
              currentAmount: currentAmount !== undefined ? currentAmount : existingGoal.currentAmount,
              targetDate: targetDate !== undefined ? new Date(targetDate) : existingGoal.targetDate,
              isActive: isActive !== undefined ? isActive : existingGoal.isActive,
              priority: priority !== undefined ? priority : existingGoal.priority,
            },
          });
          
          return res.status(200).json({
            success: true,
            data: goal,
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to update goal' });
        }
      }
    }
    
    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Goal ID is required' });
      }
      
      if (isDev) {
        // Check if goal exists and belongs to user
        const goalIndex = mockGoals.findIndex(g => g.id === id && g.userId === userId);
        if (goalIndex === -1) {
          return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        
        // Delete goal
        mockGoals = mockGoals.filter((_, index) => index !== goalIndex);
        return res.status(200).json({ success: true, data: { id: id as string } });
      } else {
        // Production mode using Prisma
        try {
          // Check if goal exists and belongs to user
          const existingGoal = await prisma.financialGoal.findUnique({
            where: { id: id as string },
          });
          
          if (!existingGoal || existingGoal.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
          }
          
          // Delete goal
          await prisma.financialGoal.delete({
            where: { id: id as string },
          });
          
          return res.status(200).json({
            success: true,
            data: { id: id as string },
          });
        } catch (error) {
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to delete goal' });
        }
      }
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Financial Goals API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process financial goals request' });
  }
});