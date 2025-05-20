import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface ReviewRequest {
  record: any;
  message?: string;
}

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
const API_KEY = process.env.GEMINI_API_KEY;

export default createApiHandler<string>(async (
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<string>>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ success: false, error: 'AI service not configured' });
  }

  const userId = await authenticate(req);
  const { recordType } = req.query;
  if (recordType !== 'asset' && recordType !== 'debt') {
    return res.status(400).json({ success: false, error: 'Invalid record type' });
  }

  const { record, message } = req.body as ReviewRequest;
  if (!record) {
    return res.status(400).json({ success: false, error: 'Record data is required' });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  let pdfPart;
  if (record.statementPath) {
    const abs = path.join(process.cwd(), 'public', record.statementPath);
    try {
      const data = await fs.promises.readFile(abs);
      pdfPart = { inlineData: { data: data.toString('base64'), mimeType: 'application/pdf' } };
    } catch {
      // ignore missing file
    }
  }

  const prompt = `You are PocketFA helping a user review a ${recordType}. Here is the JSON data:\n${JSON.stringify(record)}\n${message ? 'User question: '+message : 'Provide a brief analysis and recommendations.'}`;

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: pdfPart ? [pdfPart, { text: prompt }] : [{ text: prompt }]
      }
    ],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
    ]
  });

  return res.status(200).json({ success: true, data: result.response.text() });
});
