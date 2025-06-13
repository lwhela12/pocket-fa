import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface ReviewRequest {
  record: any;
  message?: string;
  history?: { sender: 'user' | 'ai'; text: string }[];
  pdfBase64?: string;
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

  const { record, message, history = [], pdfBase64 } = req.body as ReviewRequest;
  if (!record) {
    return res.status(400).json({ success: false, error: 'Record data is required' });
  }
  console.log('Record JSON:', JSON.stringify(record));
  console.log('User message:', message);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  let pdfPart;
  if (pdfBase64) {
    pdfPart = { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } };
  } else if (record.statementPath) {
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

  const systemPrompt = `You are PocketFA focused exclusively on analyzing the uploaded ${recordType} statement. Use the PDF content and the JSON record below to answer the user's questions. Provide clear details about asset allocation, specific positions and any notable fees. Your replies should include:\n- Summary\n- Key Observations\n- Actionable Recommendations\n\nHere is the ${recordType} record in JSON form:\n${JSON.stringify(record)}`;

  const historyForAI = history.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  const introParts = pdfPart ? [pdfPart, { text: systemPrompt }] : [{ text: systemPrompt }];

  const chat = model.startChat({
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ],
    history: [
      { role: 'user', parts: introParts },
      { role: 'model', parts: [{ text: 'Understood. I will analyze the statement based on the provided data.' }] },
      ...historyForAI
    ]
  });

  const query = message || 'Please review the statement and provide a summary with key observations and actionable recommendations.';

  const result = await chat.sendMessage(query);
  console.log('Gemini result:', JSON.stringify(result, null, 2));
  const responseText = result.response.text();

  return res.status(200).json({ success: true, data: responseText });
});
