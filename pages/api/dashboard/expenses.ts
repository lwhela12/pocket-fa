import type { NextApiRequest, NextApiResponse } from 'next';
import type { ExpenseRecord, Expense } from '@prisma/client';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

type ExpenseRecordWithExpenses = ExpenseRecord & {
  expenses?: Expense[];
};

export default createApiHandler<ExpenseRecordWithExpenses | ExpenseRecordWithExpenses[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ExpenseRecordWithExpenses | ExpenseRecordWithExpenses[]>>
) => {
  // Authenticate user
  const userId = await authenticate(req);

  // GET: fetch expense records
  if (req.method === 'GET') {
    const { id, month } = req.query;

    // Get specific record by ID
    if (id) {
      const record = await prisma.expenseRecord.findUnique({
        where: { id: id as string },
        include: { expenses: true },
      });
      if (!record || record.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Expense record not found' });
      }
      return res.status(200).json({ success: true, data: record });
    }

    // Get record for specific month
    if (month) {
      const monthDate = new Date(month as string);
      const record = await prisma.expenseRecord.findUnique({
        where: {
          userId_month: {
            userId,
            month: monthDate,
          }
        },
        include: { expenses: true },
      });
      if (record) {
        return res.status(200).json({ success: true, data: record });
      }
      return res.status(404).json({ success: false, error: 'No expense record for this month' });
    }

    // Get all records for user
    const records = await prisma.expenseRecord.findMany({
      where: { userId },
      include: { expenses: true },
      orderBy: { month: 'desc' },
    });
    return res.status(200).json({ success: true, data: records });
  }

  // POST: create or update expense record for a month
  if (req.method === 'POST') {
    const {
      month,
      isDetailed,
      totalMonthly,
      housing,
      utilities,
      groceries,
      dining,
      transport,
      healthcare,
      entertainment,
      miscellaneous,
    } = req.body;

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month is required' });
    }

    const monthDate = new Date(month);

    // Check if record exists for this month
    const existing = await prisma.expenseRecord.findUnique({
      where: {
        userId_month: {
          userId,
          month: monthDate,
        }
      },
    });

    if (existing) {
      // Update existing record
      const updated = await prisma.expenseRecord.update({
        where: { id: existing.id },
        data: {
          isDetailed: isDetailed ?? existing.isDetailed,
          totalMonthly: totalMonthly !== undefined ? parseFloat(totalMonthly) : existing.totalMonthly,
          housing: housing !== undefined ? parseFloat(housing) : existing.housing,
          utilities: utilities !== undefined ? parseFloat(utilities) : existing.utilities,
          groceries: groceries !== undefined ? parseFloat(groceries) : existing.groceries,
          dining: dining !== undefined ? parseFloat(dining) : existing.dining,
          transport: transport !== undefined ? parseFloat(transport) : existing.transport,
          healthcare: healthcare !== undefined ? parseFloat(healthcare) : existing.healthcare,
          entertainment: entertainment !== undefined ? parseFloat(entertainment) : existing.entertainment,
          miscellaneous: miscellaneous !== undefined ? parseFloat(miscellaneous) : existing.miscellaneous,
        },
        include: { expenses: true },
      });
      return res.status(200).json({ success: true, data: updated });
    }

    // Create new record
    const record = await prisma.expenseRecord.create({
      data: {
        userId,
        month: monthDate,
        isDetailed: isDetailed || false,
        totalMonthly: totalMonthly ? parseFloat(totalMonthly) : null,
        housing: housing ? parseFloat(housing) : null,
        utilities: utilities ? parseFloat(utilities) : null,
        groceries: groceries ? parseFloat(groceries) : null,
        dining: dining ? parseFloat(dining) : null,
        transport: transport ? parseFloat(transport) : null,
        healthcare: healthcare ? parseFloat(healthcare) : null,
        entertainment: entertainment ? parseFloat(entertainment) : null,
        miscellaneous: miscellaneous ? parseFloat(miscellaneous) : null,
      },
      include: { expenses: true },
    });
    return res.status(201).json({ success: true, data: record });
  }

  // PUT: update existing expense record
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Expense record ID is required' });
    }

    const existing = await prisma.expenseRecord.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Expense record not found' });
    }

    const {
      isDetailed,
      totalMonthly,
      housing,
      utilities,
      groceries,
      dining,
      transport,
      healthcare,
      entertainment,
      miscellaneous,
    } = req.body;

    const updated = await prisma.expenseRecord.update({
      where: { id: id as string },
      data: {
        isDetailed: isDetailed ?? existing.isDetailed,
        totalMonthly: totalMonthly !== undefined ? parseFloat(totalMonthly) : existing.totalMonthly,
        housing: housing !== undefined ? parseFloat(housing) : existing.housing,
        utilities: utilities !== undefined ? parseFloat(utilities) : existing.utilities,
        groceries: groceries !== undefined ? parseFloat(groceries) : existing.groceries,
        dining: dining !== undefined ? parseFloat(dining) : existing.dining,
        transport: transport !== undefined ? parseFloat(transport) : existing.transport,
        healthcare: healthcare !== undefined ? parseFloat(healthcare) : existing.healthcare,
        entertainment: entertainment !== undefined ? parseFloat(entertainment) : existing.entertainment,
        miscellaneous: miscellaneous !== undefined ? parseFloat(miscellaneous) : existing.miscellaneous,
      },
      include: { expenses: true },
    });
    return res.status(200).json({ success: true, data: updated });
  }

  // DELETE: remove expense record
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Expense record ID is required' });
    }

    const existing = await prisma.expenseRecord.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Expense record not found' });
    }

    await prisma.expenseRecord.delete({ where: { id: id as string } });
    return res.status(200).json({ success: true, data: { id: id as string } as any });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});
