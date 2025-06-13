import handler from '../pages/api/review/[recordType]';
import { storeContext } from '../lib/context-cache';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

const mockGenerate = jest.fn().mockResolvedValue({ response: { text: () => 'ok' } });
const mockModel = { generateContent: mockGenerate };
const mockGetModel = jest.fn().mockReturnValue(mockModel);

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({ getGenerativeModel: mockGetModel })),
  HarmCategory: { HARM_CATEGORY_HARASSMENT: 0, HARM_CATEGORY_HATE_SPEECH: 1, HARM_CATEGORY_SEXUALLY_EXPLICIT: 2, HARM_CATEGORY_DANGEROUS_CONTENT: 3 },
  HarmBlockThreshold: { BLOCK_NONE: 0 },
}));

const createMocks = () => {
  const req: any = { method: 'GET', query: { recordType: 'statement' }, body: {}, headers: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return { req, res };
};

describe('review api', () => {
  it('rejects non-POST', async () => {
    const { req, res } = createMocks();
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('uses cached context', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.NODE_ENV = 'development';
    const contextId = storeContext({ foo: 'bar' });
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { contextId, message: 'Hi', history: [] };
    await (handler as any)(req, res);
    expect(mockGenerate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
