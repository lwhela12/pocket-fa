import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type ChatSession } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';
const API_KEY = process.env.GEMINI_API_KEY;

const generationConfig = {
  temperature: 0.4,
  maxOutputTokens: 8192,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getModel() {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const globalForModel = globalThis as { geminiModel?: ReturnType<GoogleGenerativeAI['getGenerativeModel']> };
  if (!globalForModel.geminiModel) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    globalForModel.geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return globalForModel.geminiModel!;
}

export function startChat(history: { role: string; parts: { text: string }[] }[] = []): ChatSession {
  const model = getModel();
  return model.startChat({ generationConfig, safetySettings, history });
}

export async function sendMessage(session: ChatSession, message: string): Promise<string> {
  const result = await session.sendMessage(message);
  return result.response.text().trim();
}

export async function sendMessageStream(session: ChatSession, message: string) {
  return session.sendMessageStream(message);
}
