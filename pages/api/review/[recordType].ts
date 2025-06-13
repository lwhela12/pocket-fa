import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getContext } from '../../../lib/context-cache';

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

  await authenticate(req);

  const { contextId, message, history = [] } = req.body as {
    contextId?: string;
    message?: string;
    history?: { sender: 'user' | 'ai'; text: string }[];
  };

  if (!contextId || !message) {
    return res.status(400).json({ success: false, error: 'contextId and message are required' });
  }

  const context = getContext(contextId);
  if (!context) {
    return res.status(400).json({ success: false, error: 'Invalid contextId' });
  }

  const prompt = `You are a financial assistant. The user is asking a question about a statement you have already analyzed. Use the following structured data and conversation history to answer.

### Analyzed Statement Data:
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

### Conversation History:
${JSON.stringify(history)}

### User's New Question:
"${message}"

Your task is to answer the user's new question based *only* on the provided data and history.`;

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  const responseText = result.response.text().trim();
  return res.status(200).json({ success: true, data: responseText });
});
