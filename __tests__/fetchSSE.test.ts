/* eslint-disable */
import { fetchSSE } from '../lib/api-utils';

describe('fetchSSE', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calls onMessage for each SSE data chunk', async () => {
    const encoder = new TextEncoder();
    const chunks = ['data: "one"\n\n', 'data: "two"\n\n'];
    const reader = {
      read: jest.fn()
        .mockResolvedValueOnce({ value: encoder.encode(chunks[0]), done: false })
        .mockResolvedValueOnce({ value: encoder.encode(chunks[1]), done: false })
        .mockResolvedValueOnce({ done: true }),
    };
    // @ts-expect-error mocked fetch response
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, body: { getReader: () => reader } });

    const messages: any[] = [];
    await fetchSSE('/test', { method: 'GET' }, (msg) => messages.push(msg));

    expect(messages).toEqual(['one', 'two']);
    expect(reader.read).toHaveBeenCalledTimes(3);
  });
});