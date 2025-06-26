import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { Statement } from '@prisma/client';
import { randomUUID } from 'crypto';
import statementStatusEmitter from '../../lib/events';

// --- Start of New Type Definitions ---
export interface Holding {
  symbol: string | null;
  description: string;
  quantity: number;
  price: number;
  value: number;
}

export interface Account {
  account_name: string;
  account_number: string;
  account_holder: string;
  total_value: number;
  holdings: Holding[];
}

export interface InsuranceAccount {
  policy_name: string;
  total_value: number;
}

export interface StatementSummary {
  brokerageCompany: string;
  statementDate: string;
  qualitativeSummary: string;
  overall_investment_summary: {
    beginning_value: number;
    ending_value: number;
    change_in_value: number;
    asset_allocation: {
      [key: string]: { value: number; percentage: number };
    };
  } | null;
  personal_investment_accounts: Account[];
  retirement_investment_accounts_tax_qualified: Account[];
  insurance_accounts: InsuranceAccount[];
  fees_summary?: {
    total_fees: number;
    management_fees: number | null;
    transaction_fees: number | null;
    fees_commentary: string | null;
  };
}
// --- End of New Type Definitions ---

function scrubPii(data: StatementSummary) {
  const maskAccountNumber = (num?: string) => {
    if (!num) return num;
    if (num.length <= 4) return num;
    return num.slice(-4).padStart(num.length, '*');
  };

  const cleanAccounts = (accounts: Account[]) => {
    for (const acct of accounts) {
      delete (acct as any).account_holder;
      if (acct.account_number) {
        acct.account_number = maskAccountNumber(acct.account_number);
      }
    }
  };

  if (data.personal_investment_accounts) {
    cleanAccounts(data.personal_investment_accounts);
  }
  if (data.retirement_investment_accounts_tax_qualified) {
    cleanAccounts(data.retirement_investment_accounts_tax_qualified);
  }
}

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
const API_KEY = process.env.GEMINI_API_KEY;

// This function now runs in the background and does not block the API response
async function processStatementInBackground(statementId: string, filePath: string) {
  try {
    console.log(`[Background] Starting analysis for statement: ${statementId}`);
    const parsedData = await analyzeWithGemini(filePath);
    scrubPii(parsedData);

    await prisma.statement.update({
      where: { id: statementId },
      data: {
        status: 'COMPLETED',
        brokerageCompany: parsedData.brokerageCompany,
        parsedData: parsedData as any,
        totalFees: (parsedData as any)?.fees_summary?.total_fees || 0,
      },
    });
    statementStatusEmitter.emit('statusUpdate', { statementId, status: 'COMPLETED' });
    console.log(`[Background] Successfully processed statement: ${statementId}`);
  } catch (error: any) {
    console.error(`[Background] Error processing statement ${statementId}:`, error);
    await prisma.statement.update({
      where: { id: statementId },
      data: { status: 'FAILED', error: error.message },
    });
    statementStatusEmitter.emit('statusUpdate', { statementId, status: 'FAILED' });
  } finally {
    try {
      await fs.promises.unlink(filePath);
      console.log(`[Background] Deleted temp file ${filePath}`);
    } catch (err) {
      console.error(`[Background] Failed to delete temp file ${filePath}:`, err);
    }
  }
}

async function analyzeWithGemini(filePath: string): Promise<StatementSummary> {
    // ... existing analyzeWithGemini function ...
    // (No changes needed here)
    if (!API_KEY) throw new Error('Gemini API key not configured');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  
    const prompt = `
      You are an expert financial statement parser for a tool called Pocket Financial Advisor.
      Your task is to analyze the provided PDF statement and extract its data into a structured JSON format.
      It is CRITICAL that you adhere strictly to the following JSON schema for ALL statements, simple or complex.
  
      **Golden Standard JSON Schema:**
      {
        "brokerageCompany": "string",
        "statementDate": "YYYY-MM-DD",
        "qualitativeSummary": "string (A brief, one-paragraph summary of the statement's key activities and overall financial picture.)",
        "overall_investment_summary": {
          "beginning_value": "number",
          "ending_value": "number",
          "change_in_value": "number",
          "asset_allocation": {
              "asset_class_name": { "value": "number", "percentage": "number" }
          }
        },
        "personal_investment_accounts": [
          {
            "account_name": "string",
            "account_number": "string (masked)",
            "account_holder": "string",
            "total_value": "number",
            "holdings": [
              {
                "symbol": "string (if available, otherwise null)",
                "description": "string",
                "quantity": "number",
                "price": "number",
                "value": "number"
              }
            ]
          }
        ],
        "retirement_investment_accounts_tax_qualified": [
          // Same structure as personal_investment_accounts
        ],
        "insurance_accounts": [
          // A simplified structure for insurance policies
        ],
        "fees_summary": {
          "total_fees": "number",
          "management_fees": "number | null",
          "transaction_fees": "number | null",
          "fees_commentary": "string | null (A brief note if fees are not visible but are likely to exist)"
        }
      }
  
      **Instructions:**
      1.  **ALWAYS** use this exact structure. If a section or field is not present in the statement, return the key with an empty array or a null value.
      2.  **holdings**: This is the most important part. For every investment account, you MUST list all individual positions in the holdings array.
      3.  **qualitativeSummary**: Always provide a helpful, concise summary.
      4.  If the statement is very simple (e.g., a bank statement with no investments), populate the top-level fields and leave the account arrays empty.
      5.  IMPORTANT: For privacy, redact all personal names and use only the last 4 digits of any account numbers in the final JSON output. The "account_holder" field should be omitted.
      You MUST carefully scan the document for any mention of fees, including management fees, administrative fees, or transaction costs. Sum them up and populate the \`fees_summary\` object. If no fees are found, return 0 for \`total_fees\`.
      CRITICAL: If \`total_fees\` is 0, check the account types. If the statement includes a 401k, mutual funds, annuities, or insurance products, you MUST populate the \`fees_commentary\` field with a note such as: 'No fees were explicitly listed on this statement, but products like 401(k)s, mutual funds, or annuities typically have underlying fees (e.g., expense ratios, administrative fees) that may not be detailed here.' If it's a simple checking/savings account, this field can be null.

      Now, process the attached PDF and provide ONLY the JSON output.
    `;
  
    console.log('--- Sending Final Prompt to Gemini ---');
  
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: fileBuffer.toString('base64') } }, { text: prompt }] }],
      });
  
      const rawText = result.response.text().trim();
      console.log('--- Received Raw Response from Gemini ---');
      console.log(rawText);
  
      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/s);
      const jsonString = jsonMatch ? jsonMatch[1] : rawText;
  
      if (!jsonString) {
        throw new Error('AI response was empty.');
      }
  
      return JSON.parse(jsonString) as StatementSummary;
    } catch (e: any) {
      console.error('Error during Gemini analysis or JSON parsing:', e.message);
      throw new Error(`AI analysis failed: ${e.message}`);
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

  const statementId = randomUUID();
  const destPath = path.join('/tmp', `${statementId}.pdf`);
  const buffer = Buffer.from(file, 'base64');
  await fs.promises.writeFile(destPath, buffer);

  const statementRecord = await prisma.statement.create({
    data: {
      id: statementId,
      userId,
      fileName: filename,
      filePath: destPath,
      status: 'PROCESSING',
    },
  });

  try {
    res.status(202).json({ success: true, data: statementRecord });
    processStatementInBackground(statementRecord.id, destPath);
  } catch (error: any) {
    fs.promises.unlink(destPath).catch(() => {});
    console.error('Statement upload file handling error:', error);
    return res.status(500).json({ success: false, error: 'Could not process the uploaded file.' });
  }
});
