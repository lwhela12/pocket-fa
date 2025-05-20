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

  const pdfPart =
    fileData.length > 20 * 1024 * 1024
      ? await genAI.files.upload({ file: fileData, config: { mimeType: 'application/pdf' } })
      : { inlineData: { data: fileData, mimeType: 'application/pdf' } };

  // 1) Updated prompt: force a JSON‐only response
  const prompt = `
You are a financial document analysis assistant.
A user has uploaded a PDF statement.  Determine if it is an asset or liability,
extract the relevant fields, and *respond with exactly one JSON object* matching this schema:
{
  "recordType": "asset"|"debt",
  "asset"?: { ... },
  "debt"?: { ... }
}
Do NOT include any extra text, markdown, or explanation—only output the JSON.
`;
  
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [pdfPart, { text: prompt }],
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

  const rawText = result.response.text().trim();
  if (!rawText) {
    throw new Error('Received empty response from Gemini.');
  }

  // 2) Try to extract JSON from ```json``` block:
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
