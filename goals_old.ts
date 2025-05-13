import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';
import prisma from '../../../lib/prisma';
import type { Goal } from '@prisma/client';
import type { Goal } from '@prisma/client';




export default createApiHandler<Goal | Goal[]>(async (
export default createApiHandler<Goal | Goal[]>(async (
  req: NextApiRequest,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Goal | Goal[]>>
  res: NextApiResponse<ApiResponse<Goal | Goal[]>>
) => {
) => {
  try {
  try {
    // Authenticate user
    // Authenticate user
    const userId = await authenticate(req);
    const userId = await authenticate(req);
    
    
    // Development mode uses mock data
    // Development mode uses mock data
    const isDev = process.env.NODE_ENV === 'development';
    const isDev = process.env.NODE_ENV === 'development';
    
    
    // Handle GET request
    // Handle GET request
    if (req.method === 'GET') {
    if (req.method === 'GET') {
      // Check if we're getting a single goal or all goals
      // Check if we're getting a single goal or all goals
      const { id } = req.query;
      const { id } = req.query;
      
      
      if (id) {
      if (id) {
        // Get single goal
        // Get single goal
        if (isDev) {
        if (isDev) {
          const goal = mockGoals.find(g => g.id === id && g.userId === userId);
          const goal = mockGoals.find(g => g.id === id && g.userId === userId);
          if (!goal) {
          if (!goal) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
            return res.status(404).json({ success: false, error: 'Goal not found' });
          }
          }
          return res.status(200).json({ success: true, data: goal });
          return res.status(200).json({ success: true, data: goal });
        } else {
        } else {
          // Production mode using Prisma
          // Production mode using Prisma
          try {
          try {
            const goal = await prisma.financialGoal.findUnique({
            const goal = await prisma.financialGoal.findUnique({
              where: { id: id as string },
              where: { id: id as string },
            });
            });
            
            
            if (!goal || goal.userId !== userId) {
            if (!goal || goal.userId !== userId) {
              return res.status(404).json({ success: false, error: 'Goal not found' });
              return res.status(404).json({ success: false, error: 'Goal not found' });
            }
            }
            
            
            return res.status(200).json({
            return res.status(200).json({
              success: true,
              success: true,
              data: goal,
              data: goal,
            });
            });
          } catch (error) {
          } catch (error) {
            console.error('Database error:', error);
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve goal' });
            return res.status(500).json({ success: false, error: 'Failed to retrieve goal' });
          }
          }
        }
        }
      } else {
      } else {
        // Get all goals
        // Get all goals
        if (isDev) {
        if (isDev) {
          const userGoals = mockGoals.filter(g => g.userId === userId);
          const userGoals = mockGoals.filter(g => g.userId === userId);
          return res.status(200).json({ success: true, data: userGoals });
          return res.status(200).json({ success: true, data: userGoals });
        } else {
        } else {
          // Production mode using Prisma
          // Production mode using Prisma
          try {
          try {
            const goals = await prisma.financialGoal.findMany({
            const goals = await prisma.financialGoal.findMany({
              where: { userId },
              where: { userId },
              orderBy: { priority: 'asc' },
              orderBy: { priority: 'asc' },
            });
            });
            
            
            return res.status(200).json({
            return res.status(200).json({
              success: true,
              success: true,
              data: goals,
              data: goals,
            });
            });
          } catch (error) {
          } catch (error) {
            console.error('Database error:', error);
            console.error('Database error:', error);
            return res.status(500).json({ success: false, error: 'Failed to retrieve goals' });
            return res.status(500).json({ success: false, error: 'Failed to retrieve goals' });
          }
          }
        }
        }
      }
      }
    }
    }
    
    
    // Handle POST request (create goal)
    // Handle POST request (create goal)
    if (req.method === 'POST') {
    if (req.method === 'POST') {
      const { 
      const { 
        name, 
        name, 
        targetAmount, 
        targetAmount, 
        currentAmount, 
        currentAmount, 
        targetDate, 
        targetDate, 
        isActive, 
        isActive, 
        priority 
        priority 
      } = req.body;
      } = req.body;
      
      
      // Validate required fields
      // Validate required fields
      if (!name || targetAmount === undefined || currentAmount === undefined) {
      if (!name || targetAmount === undefined || currentAmount === undefined) {
        return res.status(400).json({ 
        return res.status(400).json({ 
          success: false, 
          success: false, 
          error: 'Name, target amount, and current amount are required' 
          error: 'Name, target amount, and current amount are required' 
        });
        });
      }
      }
      
      
      // Create goal
      // Create goal
      if (isDev) {
      if (isDev) {
        const newGoal: FinancialGoal = {
        const newGoal: FinancialGoal = {
          id: randomUUID(),
          id: randomUUID(),
          userId,
          userId,
          name,
          name,
          targetAmount: parseFloat(targetAmount),
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount),
          currentAmount: parseFloat(currentAmount),
          targetDate: targetDate ? new Date(targetDate) : null,
          targetDate: targetDate ? new Date(targetDate) : null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          priority: priority !== undefined ? parseInt(priority, 10) : 1,
          priority: priority !== undefined ? parseInt(priority, 10) : 1,
          createdAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
          updatedAt: new Date()
        };
        };
        
        
        mockGoals.push(newGoal);
        mockGoals.push(newGoal);
        return res.status(201).json({ success: true, data: newGoal });
        return res.status(201).json({ success: true, data: newGoal });
      } else {
      } else {
        // Production mode using Prisma
        // Production mode using Prisma
        try {
        try {
          const goal = await prisma.financialGoal.create({
          const goal = await prisma.financialGoal.create({
            data: {
            data: {
              userId,
              userId,
              name,
              name,
              targetAmount,
              targetAmount,
              currentAmount,
              currentAmount,
              targetDate: targetDate ? new Date(targetDate) : null,
              targetDate: targetDate ? new Date(targetDate) : null,
              isActive: isActive !== undefined ? isActive : true,
              isActive: isActive !== undefined ? isActive : true,
              priority: priority || 1,
              priority: priority || 1,
            },
            },
          });
          });
          
          
          return res.status(201).json({
          return res.status(201).json({
            success: true,
            success: true,
            data: goal,
            data: goal,
          });
          });
        } catch (error) {
        } catch (error) {
          console.error('Database error:', error);
          console.error('Database error:', error);
          return res.status(500).json({ success: false, error: 'Failed to create goal' });
          return res.status(500).json({ success: false, error: 'Failed to create goal' });
        }
        }
      }
      }
    }
    }
    
    
    // Handle PUT request (update goal)
    // Handle PUT request (update goal)
    if (req.method === 'PUT') {
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { id } = req.query;
      
      
      if (!id) {
      if (!id) {
        return res.status(400).json({ success: false, error: 'Goal ID is required' });
        return res.status(400).json({ success: false, error: 'Goal ID is required' });
      }
      }
      
      
      if (isDev) {
      if (isDev) {
        // Check if goal exists and belongs to user
        // Check if goal exists and belongs to user
        const goalIndex = mockGoals.findIndex(g => g.id === id && g.userId === userId);
        const goalIndex = mockGoals.findIndex(g => g.id === id && g.userId === userId);
        if (goalIndex === -1) {
        if (goalIndex === -1) {
          return res.status(404).json({ success: false, error: 'Goal not found' });
          return res.status(404).json({ success: false, error: 'Goal not found' });
        }
        }
        
        
        const existingGoal = mockGoals[goalIndex];
        const existingGoal = mockGoals[goalIndex];
        const { 
        const { 
          name, 
          name, 
          targetAmount, 
          targetAmount, 
          currentAmount, 
          currentAmount, 
          targetDate, 
          targetDate, 
          isActive, 
          isActive, 
          priority 
          priority 
        } = req.body;
        } = req.body;
        
        
        // Update goal
        // Update goal
        const updatedGoal = {
        const updatedGoal = {
          ...existingGoal,
          ...existingGoal,
          name: name !== undefined ? name : existingGoal.name,
          name: name !== undefined ? name : existingGoal.name,
          targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : existingGoal.targetAmount,
          targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : existingGoal.targetAmount,
          currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : existingGoal.currentAmount,
          currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : existingGoal.currentAmount,
          targetDate: targetDate !== undefined ? new Date(targetDate) : existingGoal.targetDate,
          targetDate: targetDate !== undefined ? new Date(targetDate) : existingGoal.targetDate,
          isActive: isActive !== undefined ? Boolean(isActive) : existingGoal.isActive,
          isActive: isActive !== undefined ? Boolean(isActive) : existingGoal.isActive,
          priority: priority !== undefined ? parseInt(priority, 10) : existingGoal.priority,
          priority: priority !== undefined ? parseInt(priority, 10) : existingGoal.priority,
          updatedAt: new Date()
          updatedAt: new Date()
        };
        };
        
        
        mockGoals[goalIndex] = updatedGoal;
        mockGoals[goalIndex] = updatedGoal;
        return res.status(200).json({ success: true, data: updatedGoal });
        return res.status(200).json({ success: true, data: updatedGoal });
      } else {
      } else {
        // Production mode using Prisma
        // Production mode using Prisma
        try {
        try {
          // Check if goal exists and belongs to user
          // Check if goal exists and belongs to user
          const existingGoal = await prisma.financialGoal.findUnique({
          const existingGoal = await prisma.financialGoal.findUnique({
            where: { id: id as string },
            where: { id: id as string },
          });
          });
          
          
          if (!existingGoal || existingGoal.userId !== userId) {
          if (!existingGoal || existingGoal.userId !== userId) {
            return res.status(404).json({ success: false, error: 'Goal not found' });
            return res.status(404).json({ success: false, error: 'Goal not found' });
          }
          }
          
          
          const { 
          const { 
            name, 
            name, 
            targetAmount, 
            targetAmount, 
            currentAmount, 
            currentAmount, 
            targetDate, 
            targetDate, 
            isActive, 
            isActive, 
            priority 
            priority 
          } = req.body;
          } = req.body;
          
          
          // Update goal
          // Update goal
          const goal = await prisma.financialGoal.update({
          const goal = await prisma.financialGoal.update({
            where: { id: id as string },
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