import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { Statement } from '@prisma/client';

export interface StatementSummary {
  brokerageCompany: string;
  accountCount: number;
  accounts: any[];
  qualitativeSummary: string;
}

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeWithGemini(filePath: string): Promise<any> {
  if (!API_KEY) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are an expert statement parser. Read the PDF and return a JSON summary.`;

  const fileBuffer = await fs.promises.readFile(filePath);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: fileBuffer.toString('base64') } }, { text: prompt }] }],
  });

  const rawText = result.response.text().trim();
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/s);
  const jsonString = jsonMatch ? jsonMatch[1] : rawText;

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse JSON from Gemini response:', jsonString);
    throw new Error('AI response was not valid JSON.');
  }
}

export default createApiHandler<Statement>(async (req: NextApiRequest, res: NextApiResponse<ApiResponse<Statement>>) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);
  const { file, filename } = req.body as { file?: string; filename?: string };

  if (!file || !filename) {
    return res.status(400).json({ success: false, error: 'File and filename are required.' });
  }
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ success: false, error: 'Only PDF files are allowed' });
  }

  const statementRecord = await prisma.statement.create({
    data: { userId, fileName: filename, filePath: '', status: 'UPLOADING' },
  });

  const tempPath = path.join('/tmp', `${statementRecord.id}.pdf`);
  const buffer = Buffer.from(file, 'base64');

  try {
    await fs.promises.writeFile(tempPath, buffer);
    const publicDir = path.join(process.cwd(), 'public', 'statements');
    await fs.promises.mkdir(publicDir, { recursive: true });
    const publicPath = `/statements/${statementRecord.id}.pdf`;
    const destPath = path.join(publicDir, `${statementRecord.id}.pdf`);
    await fs.promises.copyFile(tempPath, destPath);

    await prisma.statement.update({
      where: { id: statementRecord.id },
      data: { filePath: publicPath, status: 'PROCESSING' },
    });

    const parsedData = await analyzeWithGemini(destPath);

    const finalStatement = await prisma.statement.update({
      where: { id: statementRecord.id },
      data: {
        status: 'COMPLETED',
        brokerageCompany: parsedData.brokerageCompany,
        parsedData: parsedData as any,
      },
    });

    return res.status(200).json({ success: true, data: finalStatement });
  } catch (error: any) {
    await prisma.statement.update({
      where: { id: statementRecord.id },
      data: { status: 'FAILED', error: error.message },
    });
    console.error('Statement upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
});
