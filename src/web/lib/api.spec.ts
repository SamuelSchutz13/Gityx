import { api, ApiError } from './api';

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

describe('api', () => {
  it('returns JSON on success', async () => {
    globalThis.fetch = respond(200, { ok: true }) as any;
    await expect(api.get('/api/health')).resolves.toEqual({ ok: true });
  });

  it('rejects with ApiError carrying status and body', async () => {
    globalThis.fetch = respond(409, { needsConfirmation: true }) as any;
    const err: any = await api.post('/api/tests/run', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.body).toEqual({ needsConfirmation: true });
    expect((globalThis.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
  });
});
