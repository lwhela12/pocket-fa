import type { NextApiRequest, NextApiResponse } from 'next';
import type { Asset } from '@prisma/client';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import prisma from '../../../lib/prisma';

export default createApiHandler<Asset | Asset[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Asset | Asset[]>>
) => {
  // Authenticate user
  const userId = await authenticate(req);

  // GET: fetch one or all assets
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const asset = await prisma.asset.findUnique({ where: { id: id as string } });
      if (!asset || asset.userId !== userId) {
        return res.status(404).json({ success: false, error: 'Asset not found' });
      }
      return res.status(200).json({ success: true, data: asset });
    }
    const assets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: assets });
  }

  // POST: create new asset
  if (req.method === 'POST') {
    const { type, subtype, name, balance, interestRate, annualContribution, growthRate, assetClass, statementPath, statementName } = req.body;
    if (!type || !name || balance === undefined) {
      return res.status(400).json({ success: false, error: 'Type, name, and balance are required' });
    }
    const asset = await prisma.asset.create({
      data: {
        userId,
        type,
        subtype,
        name,
        balance: parseFloat(balance),
        interestRate: interestRate !== undefined ? parseFloat(interestRate) : null,
        annualContribution: annualContribution !== undefined ? parseFloat(annualContribution) : null,
        growthRate: growthRate !== undefined ? parseFloat(growthRate) : null,
        assetClass,
        statementPath,
        statementName,
      },
    });
    return res.status(201).json({ success: true, data: asset });
  }

  // PUT: update existing asset
  if (req.method === 'PUT') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Asset ID is required' });
    }
    const existing = await prisma.asset.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    const { type, subtype, name, balance, interestRate, annualContribution, growthRate, assetClass, statementPath, statementName } = req.body;
    const updated = await prisma.asset.update({
      where: { id: id as string },
      data: {
        type: type ?? existing.type,
        subtype: subtype ?? existing.subtype,
        name: name ?? existing.name,
        balance: balance !== undefined ? parseFloat(balance) : existing.balance,
        interestRate: interestRate !== undefined ? parseFloat(interestRate) : existing.interestRate,
        annualContribution: annualContribution !== undefined ? parseFloat(annualContribution) : existing.annualContribution,
        growthRate: growthRate !== undefined ? parseFloat(growthRate) : existing.growthRate,
        assetClass: assetClass ?? existing.assetClass,
        statementPath: statementPath ?? existing.statementPath,
        statementName: statementName ?? existing.statementName,
      },
    });
    return res.status(200).json({ success: true, data: updated });
  }

  // DELETE: remove asset
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Asset ID is required' });
    }
    const existing = await prisma.asset.findUnique({ where: { id: id as string } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    await prisma.asset.delete({ where: { id: id as string } });
    return res.status(200).json({ success: true, data: { id: id as string } as any });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});