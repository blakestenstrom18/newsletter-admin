import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  vi.resetModules();
});

describe('startResearch', () => {
  it('kicks off research and returns responseId immediately', async () => {
    responsesCreate.mockResolvedValue({ id: 'resp_123' });

    const { startResearch } = await import('../src/services/deepResearch');
    const responseId = await startResearch(baseCustomer as Parameters<typeof startResearch>[0]);

    expect(responseId).toBe('resp_123');
    expect(responsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: envMock.DEEP_RESEARCH_MODEL,
        background: true,
        tools: [{ type: 'web_search_preview' }],
      }),
    );
    // Should not call retrieve - that's separate
    expect(responsesRetrieve).not.toHaveBeenCalled();
  });
});

describe('checkResearchStatus', () => {
  it('returns completed with payload when research is done', async () => {
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

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_123');

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.payload).toEqual(payload);
      expect(result.rawText).toContain('customerNews');
    }
  });

  it('returns in_progress when research is still running', async () => {
    responsesRetrieve.mockResolvedValue({
      id: 'resp_123',
      status: 'in_progress',
    });

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_123');

    expect(result.status).toBe('in_progress');
  });

  it('returns in_progress when status is queued', async () => {
    responsesRetrieve.mockResolvedValue({
      id: 'resp_123',
      status: 'queued',
    });

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_123');

    expect(result.status).toBe('in_progress');
  });

  it('returns failed when payload cannot be parsed', async () => {
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

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_bad');

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toContain('Failed to parse JSON');
    }
  });

  it('returns failed when research fails', async () => {
    responsesRetrieve.mockResolvedValue({
      id: 'resp_failed',
      status: 'failed',
      last_error: { message: 'Rate limit exceeded' },
    });

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_failed');

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toBe('Rate limit exceeded');
    }
  });

  it('returns cancelled when research is cancelled', async () => {
    responsesRetrieve.mockResolvedValue({
      id: 'resp_cancelled',
      status: 'cancelled',
    });

    const { checkResearchStatus } = await import('../src/services/deepResearch');
    const result = await checkResearchStatus('resp_cancelled');

    expect(result.status).toBe('cancelled');
  });
});
