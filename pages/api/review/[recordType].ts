import type { NextApiRequest, NextApiResponse } from 'next';
import { createApiHandler, ApiResponse, authenticate } from '../../../lib/api-utils';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getContext } from '../../../lib/context-cache';
import { storeChatSession, getChatSession } from '../../../lib/chat-session-cache';

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
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
  console.log('🕵️‍♂️ Review API called. Request body:', JSON.stringify(req.body));

  if (!contextId) {
    return res.status(400).json({ success: false, error: 'contextId is required' });
  }

  const context = getContext(contextId);
  if (!context) {
    return res.status(400).json({ success: false, error: 'Invalid contextId' });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = { temperature: 0.4, maxOutputTokens: 8192 };
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];

  // Prime call: no initial message => immediately inject full context
  const isPrimeCall = message === undefined && history.length === 0;
  console.log(`→ isPrimeCall=${isPrimeCall}, history.length=${history.length}, message=${JSON.stringify(message)}`);
  // Trim leading AI greetings from history before replaying
  const trimmedHistory = [...history];
  while (trimmedHistory.length > 0 && trimmedHistory[0].sender === 'ai') {
    trimmedHistory.shift();
  }

  let historyForAI;
  if (isPrimeCall) {
    const systemPrompt = `You are a smart and friendly financial advisor who helps users understand their statements. You are well versed in Modern Portfolio Theory, Asset Allocation, Diverisification and risk management. You provide clients with clear down to earth explanations of their statments and help them identify how to optimize their portfolios.Here is the statement data:\n\n${JSON.stringify(
      context,
      null,
      2
    )}`;
    historyForAI = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I have the statement data. How can I help?' }] },
    ];
    console.log(`→ systemPrompt length=${systemPrompt.length}`);
  } else {
    historyForAI = trimmedHistory.map((msg) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
  }
  console.log('→ historyForAI:', JSON.stringify(historyForAI, null, 2));

  if (isPrimeCall) {
    const chat = model.startChat({ generationConfig, safetySettings, history: historyForAI });
    // Persist session for follow-up turns
    storeChatSession(contextId, chat);
    // Return the model's acknowledgment without sending a new user message
    const greeting = historyForAI[1].parts[0].text;
    console.log('← prime greeting:', greeting);
    return res.status(200).json({ success: true, data: greeting });
  }

  // Follow-up: reuse existing session
  const session = getChatSession(contextId)!;
  const result = await session.sendMessage(message!);
  const responseText = result.response.text().trim();
  console.log('← review responseText:', responseText);
  return res.status(200).json({ success: true, data: responseText });
});
