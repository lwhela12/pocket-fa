import handler from '../pages/api/statement-upload';

const createMocks = () => {
  const req: any = { method: 'GET', body: {}, headers: {} };
  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  return { req, res };
};

describe('statement-upload', () => {
  it('rejects non-POST', async () => {
    const { req, res } = createMocks();
    await (handler as any)(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
