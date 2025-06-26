import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { Statement } from '@prisma/client';

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
}
// --- End of New Type Definitions ---

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
const API_KEY = process.env.GEMINI_API_KEY;

// This function now runs in the background and does not block the API response
async function processStatementInBackground(statementId: string, filePath: string) {
  try {
    console.log(`[Background] Starting analysis for statement: ${statementId}`);
    const parsedData = await analyzeWithGemini(filePath);

    await prisma.statement.update({
      where: { id: statementId },
      data: {
        status: 'COMPLETED',
        brokerageCompany: parsedData.brokerageCompany,
        parsedData: parsedData as any,
      },
    });
    console.log(`[Background] Successfully processed statement: ${statementId}`);
  } catch (error: any) {
    console.error(`[Background] Error processing statement ${statementId}:`, error);
    await prisma.statement.update({
      where: { id: statementId },
      data: { status: 'FAILED', error: error.message },
    });
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
        ]
      }
  
      **Instructions:**
      1.  **ALWAYS** use this exact structure. If a section or field is not present in the statement, return the key with an empty array or a null value.
      2.  **holdings**: This is the most important part. For every investment account, you MUST list all individual positions in the holdings array.
      3.  **qualitativeSummary**: Always provide a helpful, concise summary.
      4.  If the statement is very simple (e.g., a bank statement with no investments), populate the top-level fields and leave the account arrays empty.
  
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

  // Create the record with PROCESSING status right away
  const statementRecord = await prisma.statement.create({
    data: { userId, fileName: filename, filePath: '', status: 'PROCESSING' },
  });

  const tempPath = path.join('/tmp', `${statementRecord.id}.pdf`);
  const buffer = Buffer.from(file, 'base64');

  try {
    await fs.promises.writeFile(tempPath, buffer);
    const publicDir = path.join('/tmp', 'statements');
    await fs.promises.mkdir(publicDir, { recursive: true });
    const destPath = path.join(publicDir, `${statementRecord.id}.pdf`);
    await fs.promises.copyFile(tempPath, destPath);

    const publicPath = destPath;

    // Update the path and immediately respond to the user
    await prisma.statement.update({
      where: { id: statementRecord.id },
      data: { filePath: publicPath },
    });

    // Respond immediately with a 202 Accepted status
    res.status(202).json({ success: true, data: statementRecord });

    // Start the background processing AFTER responding
    processStatementInBackground(statementRecord.id, destPath);

  } catch (error: any) {
    // If initial file handling fails, mark as FAILED
    await prisma.statement.update({
      where: { id: statementRecord.id },
      data: { status: 'FAILED', error: `File handling failed: ${error.message}` },
    });
    console.error('Statement upload file handling error:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    // Clean up the temp file, but don't block for it
    fs.promises.unlink(tempPath).catch(() => {});
  }
});
