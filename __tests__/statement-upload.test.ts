import handler from '../pages/api/statement-upload';

// Mock file system and AI client for successful parsing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('dummy')),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@google/generative-ai', () => {
  const mockGenerate = jest.fn().mockResolvedValue({
    response: {
      text: () => '```json
{"recordType":"asset","asset":{"type":"Cash","subtype":"Checking","name":"Bank","balance":100}}
```',
    },
  });
  const mockModel = { generateContent: mockGenerate };
  const mockClient = { getGenerativeModel: jest.fn().mockReturnValue(mockModel) };
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => mockClient),
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
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'File is required' });
  });

  it('rejects non-PDF filenames', async () => {
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { file: 'Zm9v', filename: 'test.txt' };
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Only PDF files are allowed' });
  });


  it('parses PDF and returns parsed statement', async () => {
    const { req, res } = createMocks();
    req.method = 'POST';
    req.body = { file: Buffer.from('%PDF-1.4...').toString('base64'), filename: 'statement.pdf' };
    await (handler as any)(req, res);
    expect((require('fs').promises.writeFile)).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { recordType: 'asset', asset: { type: 'Cash', subtype: 'Checking', name: 'Bank', balance: 100 } },
    });
  });
});
