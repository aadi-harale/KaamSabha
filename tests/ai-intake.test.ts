import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../app/api/ai/intake/route';

const request = (description = 'My fan is noisy') => new Request('http://local/api/ai/intake', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ description }),
});

function providerResponse(content: unknown, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
  vi.unstubAllGlobals();
});

describe('server-only AI intake', () => {
  it('returns a non-blocking response when no server key exists', async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('continue') });
  });

  it('accepts only valid structured provider output', async () => {
    process.env.OPENROUTER_API_KEY = 'server-test-key';
    const value = {
      suggestedServiceCategory: 'Electrician',
      suggestedTask: 'Ceiling fan inspection',
      issueSummary: 'Fan is noisy.',
      scopeDraft: ['Inspect fan'],
      clarifyingQuestions: ['Any burning smell?'],
      possibleUrgency: 'soon',
      possibleToolsOrMaterials: ['Electrical tester'],
      uncertaintyNote: 'Confirm after inspection.',
    };
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(value));
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(value);
    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain('openrouter.ai');
    expect(JSON.stringify(call[1])).toContain('server-test-key');
  });

  it('rejects malformed output without blocking manual booking', async () => {
    process.env.OPENROUTER_API_KEY = 'server-test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse({ selectedWorker: 'W01' })));
    const response = await POST(request());
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('Continue manually') });
  });

  it('turns provider rate limits and network failures into safe responses', async () => {
    process.env.OPENROUTER_API_KEY = 'server-test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('', 429)));
    expect((await POST(request())).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const failed = await POST(request());
    expect(failed.status).toBe(502);
  });
});
