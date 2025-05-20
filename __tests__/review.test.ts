import handler from '../pages/api/review/[recordType]';

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
});
