import type { NextApiRequest, NextApiResponse } from 'next';
import statementStatusEmitter from '../../../lib/events';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (data: { statementId: string; status: string }) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    statementStatusEmitter.on('statusUpdate', listener);

    req.on('close', () => {
        statementStatusEmitter.off('statusUpdate', listener);
    });
}
