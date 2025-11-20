import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const responsesCreate = vi.fn();
const responsesRetrieve = vi.fn();

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: {
        create: responsesCreate,
        retrieve: responsesRetrieve,
      },
    })),
  };
});

const envMock = {
  OPENAI_API_KEY: 'test-key',
  DEEP_RESEARCH_MODEL: 'o3-deep-research',
  DEEP_RESEARCH_TIMEOUT_MS: 1_000,
  DEEP_RESEARCH_MAX_WAIT_MS: 15_000,
};

vi.mock('@/lib/env', () => ({
  env: envMock,
}));

type Customer = {
  id: string;
  name: string;
  industry: string;
  newsKeywords?: string[];
  competitors?: string[];
  subVerticals?: string[];
  keyPriorities?: string[];
  currentInitiatives?: string | null;
};

const baseCustomer: Customer = {
  id: 'cust_1',
  name: 'Acme Corp',
  industry: 'Retail',
  newsKeywords: ['Acme', 'Retail'],
  competitors: ['Globex'],
  subVerticals: ['Omnichannel'],
  keyPriorities: ['Digital growth'],
  currentInitiatives: 'Scale personalization',
};

beforeEach(() => {
  responsesCreate.mockReset();
  responsesRetrieve.mockReset();
  envMock.DEEP_RESEARCH_MAX_WAIT_MS = 15_000;
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('runNewsResearch', () => {
  it('returns structured payloads from completed runs', async () => {
    const payload = {
      customerNews: [
        { title: 'Acme launches AI', summary: 'Great news', url: 'https://example.com/acme-ai', source: 'TechCrunch' },
      ],
      competitorNews: [
        { title: 'Globex expands', summary: 'Competitive move', url: 'https://example.com/globex', source: 'Bloomberg' },
      ],
      industryTrends: [
        { title: 'Retail media surges', summary: 'Trend', url: 'https://example.com/retail', source: 'Forrester' },
      ],
    };

    responsesCreate.mockResolvedValue({ id: 'resp_123' });
    responsesRetrieve.mockResolvedValue({
      id: 'resp_123',
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: '```json\n' + JSON.stringify(payload) + '\n```',
            },
          ],
        },
      ],
    });

    const { runNewsResearch } = await import('../src/services/deepResearch');
    const result = await runNewsResearch(baseCustomer as any);

    expect(result.responseId).toBe('resp_123');
    expect(result.payload).toEqual(payload);
    expect(responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: envMock.DEEP_RESEARCH_MODEL,
        background: true,
      }),
    );
    expect(responsesRetrieve).toHaveBeenCalledTimes(1);
  });

  it('throws when payload cannot be parsed', async () => {
    responsesCreate.mockResolvedValue({ id: 'resp_bad' });
    responsesRetrieve.mockResolvedValue({
      id: 'resp_bad',
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: 'not-json' }],
        },
      ],
    });

    const { runNewsResearch } = await import('../src/services/deepResearch');
    await expect(runNewsResearch(baseCustomer as any)).rejects.toThrow(/Failed to parse JSON/i);
  });

  it('times out when the run never completes', async () => {
    envMock.DEEP_RESEARCH_MAX_WAIT_MS = 1_000;
    responsesCreate.mockResolvedValue({ id: 'resp_timeout' });
    responsesRetrieve.mockResolvedValue({ id: 'resp_timeout', status: 'in_progress' });

    vi.useFakeTimers();

    const { runNewsResearch } = await import('../src/services/deepResearch');
    const expectation = expect(runNewsResearch(baseCustomer as any)).rejects.toThrow(/timed out/i);

    await vi.advanceTimersByTimeAsync(2_000);

    await expectation;
  });
});

