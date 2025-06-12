import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface AssetData {
  type: string;
  subtype?: string;
  name: string;
  balance: number;
  interestRate?: number;
  annualContribution?: number;
  growthRate?: number;
  assetClass?: string;
  statementPath?: string;
  statementName?: string;
}

interface DebtData {
  type: string;
  lender: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
  termLength?: number;
  statementPath?: string;
  statementName?: string;
}

interface ParsedStatement {
  recordType: 'asset' | 'debt' | null;
  asset?: AssetData;
  debt?: DebtData;
}

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeWithGemini(filePath: string): Promise<ParsedStatement[]> {
  if (!API_KEY) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(API_KEY); // Corrected GoogleGenerativeAI constructor
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const fileData = await fs.promises.readFile(filePath);

  let pdfPart;
  console.log(`File size: ${fileData.length} bytes`);

  if (fileData.length > 20 * 1024 * 1024) {
    console.log('File is larger than 20MB, this may exceed Gemini API limits.');
    // The Gemini API doesn't support uploading large files separately
    // We'll still try with inlineData, but it might fail if too large
    pdfPart = { inlineData: { data: fileData.toString('base64'), mimeType: 'application/pdf' } };
    
    // Alternatively, you could implement chunking or file compression here
    // or use a different approach for very large files
  } else {
    console.log('File is smaller than 20MB, using inlineData.');
    pdfPart = { inlineData: { data: fileData.toString('base64'), mimeType: 'application/pdf' } };
  }

  const prompt = `You are an expert financial statement parser. Your task is to analyze the provided PDF and extract every account it contains. Each account should be returned as a separate JSON object.

You must return ONLY a JSON array of these objects using the schemas provided. Do not include markdown formatting like \`\`\`json or any extra text.

---

### Schemas

**Asset Schema:**
{
  "recordType": "asset",
  "asset": {
    "type": "Investment" | "Cash",
    "subtype": "401(k)" | "Roth IRA" | "Taxable" | "Checking" | "Savings" | "Other",
    "name": "string",
    "balance": 0.00,
    "assetClass": "Stocks" | "Bonds" | "Cash Equivalents" | "Other" // (for investments only)
  }
}

**Debt Schema:**
{
  "recordType": "debt",
  "debt": {
    "type": "Credit Card" | "Mortgage" | "Student Loan" | "Auto Loan" | "Personal Loan" | "Other",
    "lender": "string",
    "balance": 0.00,
    "interestRate": 0.00, // as a percentage, e.g., 21.99
    "monthlyPayment": 0.00
  }
}

---

### Examples

**Example 1: Credit Card Statement**
*Input Text Snippet from PDF:* "Chase Sapphire Preferred... New Balance: $1,234.56... Minimum Payment Due: $50.00... Purchase APR: 21.99%"
*Your JSON Output:*
{
  "recordType": "debt",
  "debt": {
    "type": "Credit Card",
    "lender": "Chase",
    "balance": 1234.56,
    "interestRate": 21.99,
    "monthlyPayment": 50.00
  }
}

**Example 2: Investment Account Statement**
*Input Text Snippet from PDF:* "Fidelity 401(k) Plan... Total account value: $12,500.75... Your Investments: Fidelity 500 Index Fund (FXAIX) 100%"
*Your JSON Output:*
{
  "recordType": "asset",
  "asset": {
    "type": "Investment",
    "subtype": "401(k)",
    "name": "Fidelity 401(k)",
    "balance": 12500.75,
    "assetClass": "Stocks"
  }
}

**Example 3: Bank Statement**
*Input Text Snippet from PDF:* "Bank of America Advantage Plus Banking... Current Balance as of 05/31/2025: $5,678.90"
*Your JSON Output:*
{
  "recordType": "asset",
  "asset": {
    "type": "Cash",
    "subtype": "Checking",
    "name": "Bank of America Checking",
    "balance": 5678.90
  }
}

**Example 4: Statement With Multiple Accounts**
*Input Text Snippet from PDF:* "Account 1 - Checking Balance $500.00\nAccount 2 - Savings Balance $1000.00"
*Your JSON Output:*
[
  {
    "recordType": "asset",
    "asset": { "type": "Cash", "subtype": "Checking", "name": "Checking Account", "balance": 500.0 }
  },
  {
    "recordType": "asset",
    "asset": { "type": "Cash", "subtype": "Savings", "name": "Savings Account", "balance": 1000.0 }
  }
]

---

Now, analyze the following document and provide the corresponding JSON array. If you cannot determine the type or extract the necessary information, return [{ "recordType": null, "error": "Could not process the document." }].`;
  
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [pdfPart, { text: prompt }],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });
  console.log('Gemini response:', result.response.text());
  const rawText = result.response.text().trim();
  if (!rawText) {
    throw new Error('Received empty response from Gemini.');
  }

  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || rawText;

  try {
    return JSON.parse(candidate);
  } catch (e: any) {
    console.error(
      'Failed to parse JSON from Gemini. Candidate text was:', candidate,
      '\nFull raw response was:', rawText,
      '\nError:', e
    );
    throw new Error(`AI response was not valid JSON: ${e.message}`);
  }
}

export default createApiHandler<ParsedStatement[]>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ParsedStatement[]>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const userId = await authenticate(req);

  const { file, filename } = req.body as { file?: string; filename?: string };
  if (!file || !filename) {
    return res.status(400).json({ success: false, error: 'File is required' });
  }
  if (!filename.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ success: false, error: 'Only PDF files are allowed' });
  }

  const buffer = Buffer.from(file, 'base64');
  const tempPath = path.join('/tmp', `${userId}-${Date.now()}-${filename}`);
  await fs.promises.writeFile(tempPath, buffer);
  const publicDir = path.join(process.cwd(), 'public', 'statements');
  await fs.promises.mkdir(publicDir, { recursive: true });
  const destName = `${userId}-${Date.now()}-${filename}`;
  const destPath = path.join(publicDir, destName);
  const relativePath = path.join('statements', destName);

  try {
    const parsed = await analyzeWithGemini(tempPath);
    await fs.promises.copyFile(tempPath, destPath);
    parsed.forEach(record => {
      if (record.recordType === 'asset' && record.asset) {
        record.asset.statementPath = relativePath;
        record.asset.statementName = filename;
      }
      if (record.recordType === 'debt' && record.debt) {
        record.debt.statementPath = relativePath;
        record.debt.statementName = filename;
      }
    });
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Statement upload error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to analyze statement' });
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
});
