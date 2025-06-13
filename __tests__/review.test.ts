import handler from '../pages/api/review/[recordType]';
import fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('dummy')),
  },
}));

const mockSend = jest.fn().mockResolvedValue({ response: { text: () => 'ok' } });
const mockChat = { sendMessage: mockSend };
const mockStart = jest.fn().mockReturnValue(mockChat);
const mockModel = { startChat: mockStart };
const mockGetModel = jest.fn().mockReturnValue(mockModel);

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({ getGenerativeModel: mockGetModel })),
  HarmCategory: { HARM_CATEGORY_HARASSMENT: 0, HARM_CATEGORY_HATE_SPEECH: 1, HARM_CATEGORY_SEXUALLY_EXPLICIT: 2, HARM_CATEGORY_DANGEROUS_CONTENT: 3 },
  HarmBlockThreshold: { BLOCK_NONE: 0 },
}));

const createMocks = () => {
  const req: any = { method: 'GET', query: { recordType: 'asset' }, body: {}, headers: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return { req, res };
};

describe('review api', () => {
  it('rejects non-POST', async () => {
    const { req, res } = createMocks();
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('uses pdfBase64 when provided', async () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.NODE_ENV = 'development';
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { record: { name: 'Test' }, pdfBase64: 'Zm9v', history: [] };
    await (handler as any)(req, res);
    expect(fs.promises.readFile).not.toHaveBeenCalled();
    const call = mockStart.mock.calls[0][0];
    expect(call.history[0].parts[0]).toEqual({ inlineData: { data: 'Zm9v', mimeType: 'application/pdf' } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
