import type { NextApiRequest, NextApiResponse } from 'next';
import type { FinancialGoal } from '@prisma/client';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

export default createApiHandler<FinancialGoal | FinancialGoal[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<FinancialGoal | FinancialGoal[]>>
) => {
  const userId = await authenticate(req);

  // GET one or all goals
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const goal = await prisma.financialGoal.findUnique({ where: { id: id as string } });
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }
      return res.status(200).json({ success: true, data: goal });
    }
    const goals = await prisma.financialGoal.findMany({ where: { userId }, orderBy: { priority: 'asc' } });
    return res.status(200).json({ success: true, data: goals });
  }

  // Create new goal
  if (req.method === 'POST') {
    const { name, targetAmount, currentAmount, targetDate, isActive, priority } = req.body;
    if (!name || targetAmount == null || currentAmount == null) {
      return res.status(400).json({
        success: false,
        error: 'Name, target amount, and current amount are required',
      });
    }
    const goal = await prisma.financialGoal.create({
      data: {
        userId,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount),
        targetDate: targetDate ? new Date(targetDate) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        priority: priority !== undefined ? parseInt(priority, 10) : 1,
      },
    });
    return res.status(201).json({ success: true, data: goal });
  }

  // Update existing goal
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Goal ID is required' });
    }
    const existing = await prisma.financialGoal.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    const { name, targetAmount, currentAmount, targetDate, isActive, priority } = req.body;
    const updated = await prisma.financialGoal.update({
      where: { id: id as string },
      data: {
        name: name ?? existing.name,
        targetAmount: targetAmount !== undefined ? parseFloat(targetAmount) : existing.targetAmount,
        currentAmount: currentAmount !== undefined ? parseFloat(currentAmount) : existing.currentAmount,
        targetDate: targetDate ? new Date(targetDate) : existing.targetDate,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        priority: priority !== undefined ? parseInt(priority, 10) : existing.priority,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  }

  // Delete goal
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Goal ID is required' });
    }
    const existing = await prisma.financialGoal.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    await prisma.financialGoal.delete({ where: { id: id as string } });
    return res.status(200).json({ success: true, data: { id: id as string } as any });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});