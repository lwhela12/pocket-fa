import type { NextApiRequest, NextApiResponse } from 'next';
import type { Debt } from '@prisma/client';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

export default createApiHandler<Debt | Debt[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Debt | Debt[]>>
) => {
  const userId = await authenticate(req);

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const debt = await prisma.debt.findUnique({ where: { id: id as string } });
      if (!debt || debt.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Debt not found' });
      }
      return res.status(200).json({ success: true, data: debt });
    }
    const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: debts });
  }

  if (req.method === 'POST') {
    const { type, lender, balance, interestRate, monthlyPayment, termLength } = req.body;
    if (!type || !lender || balance === undefined || interestRate === undefined || monthlyPayment === undefined) {
      return res.status(400).json({ success: false, error: 'Type, lender, balance, interest rate, and monthly payment are required' });
    }
    const debt = await prisma.debt.create({
      data: {
        userId,
        type,
        lender,
        balance: parseFloat(balance),
        interestRate: parseFloat(interestRate),
        monthlyPayment: parseFloat(monthlyPayment),
        termLength: termLength !== undefined ? (termLength ? parseInt(termLength, 10) : null) : null,
      },
    });
    return res.status(201).json({ success: true, data: debt });
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Debt ID is required' });
    }
    const existing = await prisma.debt.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Debt not found' });
    }
    const { type, lender, balance, interestRate, monthlyPayment, termLength } = req.body;
    const updated = await prisma.debt.update({
      where: { id: id as string },
      data: {
        type: type ?? existing.type,
        lender: lender ?? existing.lender,
        balance: balance !== undefined ? parseFloat(balance) : existing.balance,
        interestRate: interestRate !== undefined ? parseFloat(interestRate) : existing.interestRate,
        monthlyPayment: monthlyPayment !== undefined ? parseFloat(monthlyPayment) : existing.monthlyPayment,
        termLength: termLength !== undefined ? (termLength ? parseInt(termLength, 10) : null) : existing.termLength,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Debt ID is required' });
    }
    const existing = await prisma.debt.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Debt not found' });
    }
    await prisma.debt.delete({ where: { id: id as string } });
    return res.status(200).json({ success: true, data: { id: id as string } as any });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});