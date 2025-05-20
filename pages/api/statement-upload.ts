import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface ParsedStatement {
  recordType: 'asset' | 'debt';
  asset?: any;
  debt?: any;
}

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const API_KEY = process.env.GEMINI_API_KEY;

async function analyzeWithGemini(filePath: string): Promise<ParsedStatement> {
  if (!API_KEY) throw new Error('Gemini API key not configured');
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const fileData = await fs.promises.readFile(filePath);

  const prompt = `You are a financial document analysis assistant. A user has uploaded a financial statement in PDF format. Determine whether the statement represents an asset or a liability. Extract the account balance.\nIf it is an asset identify if it is cash or an investment. If it is cash provide the interest rate if available. If it is an investment provide the split between stocks and bonds, a risk level of Low, Medium, or High, and an expected rate of return based on that risk.\nIf it is a liability provide the minimum monthly payment and the interest rate.\nReturn a JSON object with the following structure:\n{recordType: 'asset'|'debt', asset?: {type:'Cash'|'Investment', subtype?:string, name?:string, balance:number, interestRate?:number, allocation?:{stocks:number,bonds:number}, riskLevel?:'Low'|'Medium'|'High', expectedReturn?:number}, debt?:{type?:string,lender?:string,balance:number,interestRate?:number,minimumPayment?:number}}`;

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: fileData.toString('base64'), mimeType: 'application/pdf' } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });

  if (result.response.promptFeedback && result.response.promptFeedback.blockReason) {
    console.error('Gemini response blocked:', result.response.promptFeedback.blockReason, result.response.promptFeedback.safetyRatings);
    throw new Error(`AI response was blocked due to: ${result.response.promptFeedback.blockReason}`);
  }

  const rawText = result.response.text();
  let jsonString = rawText;
  const match = rawText.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    jsonString = match[1];
  }
  jsonString = jsonString.trim();

  if (!jsonString) {
    console.error('Gemini response did not contain a valid JSON block. Raw response:', rawText);
    throw new Error('Failed to extract valid JSON from AI response.');
  }

  try {
    return JSON.parse(jsonString);
  } catch (e: any) {
    console.error('Failed to parse JSON from Gemini. Cleaned text was:', jsonString, 'Original text was:', rawText, 'Error:', e);
    throw new Error(`AI response was not valid JSON: ${e.message}`);
  }
}

export default createApiHandler<ParsedStatement>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ParsedStatement>>
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

  try {
    const parsed = await analyzeWithGemini(tempPath);
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Statement upload error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to analyze statement' });
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
});
