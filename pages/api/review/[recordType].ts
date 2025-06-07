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
  console.log('Review request for recordType:', recordType);
  if (recordType !== 'asset' && recordType !== 'debt') {
    return res.status(400).json({ success: false, error: 'Invalid record type' });
  }

  const { record, message } = req.body as ReviewRequest;
  if (!record) {
    return res.status(400).json({ success: false, error: 'Record data is required' });
  }
  console.log('Record JSON:', JSON.stringify(record));
  console.log('User message:', message);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  let pdfPart;
  if (record.statementPath) {
    console.log('Statement path found:', record.statementPath);
    const abs = path.join(process.cwd(), 'public', record.statementPath);
    console.log('Reading statement from:', abs);
    try {
      const data = await fs.promises.readFile(abs);
      pdfPart = {
        inlineData: { data: data.toString('base64'), mimeType: 'application/pdf' },
      };
      console.log('pdfPart created successfully');
    } catch (err) {
      console.error('Failed to read statement file:', abs, err);
    }
  }

  const prompt = `You are PocketFA helping a user review a ${recordType}. Your response must include the following sections:
- Summary: A concise overview of the ${recordType} data.
- Key Observations: Bullet-point insights or notable metrics.
- Actionable Recommendations: Practical next steps or advice based on this data.

Here is the ${recordType} record in JSON form:
${JSON.stringify(record)}

${message ? `User question: ${message}` : ''}`;
  console.log('Prompt:', prompt);

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: pdfPart ? [pdfPart, { text: prompt }] : [{ text: prompt }]
      }
    ],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
  });
  console.log('Gemini result:', JSON.stringify(result, null, 2));
  console.log('Gemini response text:', result.response.text());

  return res.status(200).json({ success: true, data: result.response.text() });
});
