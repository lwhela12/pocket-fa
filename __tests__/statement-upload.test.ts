process.env.GEMINI_API_KEY = 'test-key';
import handler from '../pages/api/statement-upload';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    statement: {
      create: jest.fn().mockResolvedValue({ id: '1', userId: '123', fileName: 'statement.pdf', filePath: '/tmp/1.pdf', brokerageCompany: null, parsedData: null, status: 'PROCESSING', error: null, createdAt: new Date(), updatedAt: new Date() }),
      update: jest.fn().mockResolvedValue({ id: '1', userId: '123', fileName: 'statement.pdf', filePath: '/tmp/1.pdf', brokerageCompany: 'Test', parsedData: { brokerageCompany: 'Test', accountCount: 1, accounts: [], qualitativeSummary: 'ok' }, status: 'COMPLETED', error: null, createdAt: new Date(), updatedAt: new Date() }),
    },
  },
}));

// Mock file system and AI client for successful parsing
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('dummy')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Google generative-ai client and file manager
jest.mock('@google/generative-ai', () => {
  const mockUploadFile = jest.fn().mockResolvedValue({ file: { uri: 'fakeUri', mimeType: 'application/pdf' } });
  const mockGenerate = jest.fn().mockResolvedValue({ response: { text: () => '```json\n{"brokerageCompany":"Test","accountCount":1,"accounts":[],"qualitativeSummary":"ok"}\n```' } });
  const mockModel = { generateContent: mockGenerate };
  const mockGenAiClient = { getGenerativeModel: jest.fn().mockReturnValue(mockModel) };
  const MockFileManager = jest.fn().mockImplementation(() => ({ uploadFile: mockUploadFile }));
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => mockGenAiClient),
    GoogleAIFileManager: MockFileManager,
    HarmCategory: { HARM_CATEGORY_HARASSMENT: 0 },
    HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: 0 },
  };
});

const createMocks = () => {
  const req: any = { method: 'GET', body: {}, headers: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return { req, res };
};

describe('statement-upload', () => {
  beforeAll(() => {
    // Allow authenticate dev-fallback to work in tests
    process.env.NODE_ENV = 'development';
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('rejects non-POST', async () => {
    const { req, res } = createMocks();
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('validates presence of file and filename', async () => {
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = {};
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'File and filename are required.' });
  });

  it('rejects non-PDF filenames', async () => {
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { file: 'Zm9v', filename: 'test.txt' };
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Only PDF files are allowed' });
  });


  it('accepts PDF for processing and returns a processing statement', async () => {
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { file: Buffer.from('%PDF-1.4...').toString('base64'), filename: 'statement.pdf' };
    await (handler as any)(req, res);
    expect(require('fs').promises.writeFile).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('PROCESSING');
  });
});
