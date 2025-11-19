import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { uploadToS3, generateS3Key, deleteFromS3 } from '../../../lib/s3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import prisma from '../../../lib/prisma';
import { BankStatement, Expense } from '@prisma/client';
import { randomUUID } from 'crypto';

// S3 client for downloading files during processing
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL_NAME = 'gemini-2.0-flash-exp';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  category: string;
  confidence: number;
}

interface BankStatementData {
  month: string;
  transactions: ParsedTransaction[];
  totalExpenses: number;
}

// Category mapping
const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Healthcare',
  'Entertainment',
  'Miscellaneous',
];

async function parseAndCategorizeStatement(s3Key: string, fileType: string): Promise<BankStatementData> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Download file from S3
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  });

  const s3Response = await s3Client.send(getCommand);

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of s3Response.Body as any) {
    chunks.push(chunk);
  }
  const fileBuffer = Buffer.concat(chunks);

  const prompt = `You are an expert at parsing bank statements and categorizing expenses.

Analyze the provided bank statement ${fileType === 'csv' ? 'CSV' : 'PDF'} file and extract ALL expense transactions (debits/withdrawals/purchases).

For each expense transaction, categorize it into EXACTLY ONE of these categories:
${EXPENSE_CATEGORIES.join(', ')}

Rules:
1. ONLY include expenses (money going out), NOT deposits or transfers in
2. Extract: date, description/merchant name, amount (as positive number), category
3. Provide confidence score (0-1) for each categorization
4. Ignore income, deposits, and transfers between accounts
5. Include subscription services, bills, purchases, fees

Respond with ONLY a JSON object in this format:
{
  "month": "2025-01",
  "transactions": [
    {
      "date": "2025-01-15",
      "description": "WHOLE FOODS MARKET",
      "amount": 87.42,
      "merchant": "Whole Foods",
      "category": "Groceries",
      "confidence": 0.95
    }
  ],
  "totalExpenses": 1234.56
}`;

  try {
    let result;

    if (fileType === 'csv') {
      const fileContent = fileBuffer.toString('utf-8');
      result = await model.generateContent([
        { text: prompt },
        { text: `\n\nCSV Content:\n${fileContent}` }
      ]);
    } else {
      // PDF
      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: fileBuffer.toString('base64')
              }
            },
            { text: prompt }
          ]
        }]
      });
    }

    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as BankStatementData;

    // Validate and clean data
    parsed.transactions = parsed.transactions.filter(t => {
      // Ensure valid category
      if (!EXPENSE_CATEGORIES.includes(t.category)) {
        t.category = 'Miscellaneous';
      }
      // Ensure amount is positive
      t.amount = Math.abs(t.amount);
      return t.amount > 0;
    });

    // Recalculate total
    parsed.totalExpenses = parsed.transactions.reduce((sum, t) => sum + t.amount, 0);

    return parsed;
  } catch (error) {
    console.error('Error parsing bank statement:', error);
    throw new Error(`Failed to parse bank statement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function processBankStatementInBackground(statementId: string, s3Key: string, fileType: string) {
  try {
    console.log(`[Background] Starting bank statement analysis: ${statementId}`);

    const parsedData = await parseAndCategorizeStatement(s3Key, fileType);

    // Get statement record
    const statement = await prisma.bankStatement.findUnique({
      where: { id: statementId }
    });

    if (!statement) {
      throw new Error('Bank statement record not found');
    }

    // Create expense records for each transaction
    const expenses: Expense[] = [];
    for (const transaction of parsedData.transactions) {
      const expense = await prisma.expense.create({
        data: {
          userId: statement.userId,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          frequency: 'one-time',
          date: new Date(transaction.date),
          merchant: transaction.merchant || null,
          isRecurring: false,
          sourceType: 'bank_import',
          bankStatementId: statementId,
        },
      });
      expenses.push(expense);
    }

    // Update expense record for the month
    const month = new Date(parsedData.month);
    const categoryTotals = expenses.reduce((acc, exp) => {
      const cat = exp.category.toLowerCase();
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    // Get or create expense record
    const existingRecord = await prisma.expenseRecord.findUnique({
      where: {
        userId_month: {
          userId: statement.userId,
          month,
        }
      },
    });

    if (existingRecord) {
      // Update existing
      await prisma.expenseRecord.update({
        where: { id: existingRecord.id },
        data: {
          isDetailed: true,
          totalMonthly: (existingRecord.totalMonthly || 0) + parsedData.totalExpenses,
          housing: (existingRecord.housing || 0) + (categoryTotals.housing || 0),
          utilities: (existingRecord.utilities || 0) + (categoryTotals.utilities || 0),
          groceries: (existingRecord.groceries || 0) + (categoryTotals.groceries || 0),
          dining: (existingRecord.dining || 0) + (categoryTotals.dining || 0),
          transport: (existingRecord.transport || 0) + (categoryTotals.transport || 0),
          healthcare: (existingRecord.healthcare || 0) + (categoryTotals.healthcare || 0),
          entertainment: (existingRecord.entertainment || 0) + (categoryTotals.entertainment || 0),
          miscellaneous: (existingRecord.miscellaneous || 0) + (categoryTotals.miscellaneous || 0),
        },
      });

      // Link expenses to record
      await prisma.expense.updateMany({
        where: { id: { in: expenses.map(e => e.id) } },
        data: { expenseRecordId: existingRecord.id },
      });
    } else {
      // Create new record
      const newRecord = await prisma.expenseRecord.create({
        data: {
          userId: statement.userId,
          month,
          isDetailed: true,
          totalMonthly: parsedData.totalExpenses,
          housing: categoryTotals.housing || null,
          utilities: categoryTotals.utilities || null,
          groceries: categoryTotals.groceries || null,
          dining: categoryTotals.dining || null,
          transport: categoryTotals.transport || null,
          healthcare: categoryTotals.healthcare || null,
          entertainment: categoryTotals.entertainment || null,
          miscellaneous: categoryTotals.miscellaneous || null,
        },
      });

      // Link expenses to record
      await prisma.expense.updateMany({
        where: { id: { in: expenses.map(e => e.id) } },
        data: { expenseRecordId: newRecord.id },
      });
    }

    // Update bank statement status
    await prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status: 'COMPLETED',
        totalExpenses: parsedData.totalExpenses,
        transactionCount: parsedData.transactions.length,
      },
    });

    console.log(`[Background] Successfully processed bank statement: ${statementId}`);
  } catch (error: any) {
    console.error(`[Background] Error processing bank statement ${statementId}:`, error);
    await prisma.bankStatement.update({
      where: { id: statementId },
      data: {
        status: 'FAILED',
        error: error.message
      },
    });

    // Clean up S3 file on failure
    try {
      await deleteFromS3(s3Key);
      console.log(`[Background] Deleted failed bank statement from S3: ${s3Key}`);
    } catch (err) {
      console.error(`[Background] Failed to delete S3 file ${s3Key}:`, err);
    }
  }
}

export default createApiHandler<BankStatement>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BankStatement>>
) => {
  const userId = await authenticate(req);

  // POST: upload bank statement
  if (req.method === 'POST') {
    const { file, filename } = req.body as { file?: string; filename?: string };

    if (!file || !filename) {
      return res.status(400).json({
        success: false,
        error: 'File and filename are required',
      });
    }

    // Determine file type
    const lowerFilename = filename.toLowerCase();
    let fileType: string;
    let mimeType: string;

    if (lowerFilename.endsWith('.csv')) {
      fileType = 'csv';
      mimeType = 'text/csv';
    } else if (lowerFilename.endsWith('.pdf')) {
      fileType = 'pdf';
      mimeType = 'application/pdf';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Only CSV and PDF files are supported',
      });
    }

    const statementId = randomUUID();
    const buffer = Buffer.from(file, 'base64');

    // Generate S3 key and upload file
    const s3Key = generateS3Key(userId, filename, 'bank-statements');

    try {
      await uploadToS3(buffer, s3Key, mimeType);
    } catch (error: any) {
      console.error('S3 upload error:', error);
      return res.status(500).json({ success: false, error: 'Failed to upload file to storage' });
    }

    // Create bank statement record
    const statementRecord = await prisma.bankStatement.create({
      data: {
        id: statementId,
        userId,
        fileName: filename,
        filePath: s3Key, // Store S3 key instead of local path
        month: new Date(), // Will be updated during processing
        totalExpenses: 0,
        transactionCount: 0,
        status: 'PROCESSING',
      },
    });

    // Start background processing
    res.status(202).json({ success: true, data: statementRecord });
    processBankStatementInBackground(statementId, s3Key, fileType);

    return;
  }

  // GET: fetch bank statements
  if (req.method === 'GET') {
    const statements = await prisma.bankStatement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ success: true, data: statements as any });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});
