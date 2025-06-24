import handler from '../pages/api/chat/stream';

process.env.NODE_ENV = 'development';

const createMocks = () => {
  const req: any = { method: 'GET', headers: {}, body: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res), writeHead: jest.fn(), write: jest.fn(), end: jest.fn() };
  return { req, res };
};

describe('/api/chat/stream', () => {
  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
