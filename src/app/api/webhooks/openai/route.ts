import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { completeNewsletterGeneration, markNewsletterFailed } from '@/services/newsletter';
import { extractPayloadFromWebhook } from '@/services/deepResearch';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/openai
 * Webhook endpoint that OpenAI calls when a deep research background task completes.
 * Configure this URL in your OpenAI dashboard under Webhooks.
 */
export async function POST(req: NextRequest) {
  // Log headers for debugging (OpenAI webhook verification)
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = key.toLowerCase().includes('secret') || key.toLowerCase().includes('auth') 
      ? '[REDACTED]' 
      : value;
  });
  console.info('[webhook] Received request with headers:', JSON.stringify(headers));

  // Note: OpenAI webhook verification is handled by checking that the responseId
  // exists in our database. Additional secret verification can be added if needed.

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.error('[webhook] Failed to parse request body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // OpenAI sends the response object directly
  const response = body as {
    id?: string;
    status?: string;
    output?: Array<{
      type: string;
      content?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
    error?: { message?: string };
  };

  const responseId = response?.id;
  if (!responseId) {
    console.error('[webhook] Missing response ID in payload');
    return NextResponse.json({ error: 'Missing response ID' }, { status: 400 });
  }

  console.info(`[webhook] received callback for responseId=${responseId}, status=${response.status}`);

  // Look up the newsletter run by responseId
  const [run] = await db
    .select()
    .from(newsletterRun)
    .where(eq(newsletterRun.researchResponseId, responseId));

  if (!run) {
    console.warn(`[webhook] No newsletter run found for responseId=${responseId}`);
    // Return 200 to acknowledge receipt even if we can't process it
    return NextResponse.json({ ok: true, message: 'No matching run found' });
  }

  // Skip if already processed
  if (run.status === 'success' || run.status === 'error') {
    console.info(`[webhook] Run ${run.id} already has status=${run.status}, skipping`);
    return NextResponse.json({ ok: true, message: 'Already processed' });
  }

  // Get customer
  const [customer] = await db
    .select()
    .from(customerConfig)
    .where(eq(customerConfig.id, run.customerId));

  if (!customer) {
    console.error(`[webhook] Customer not found for run ${run.id}`);
    await markNewsletterFailed({ runId: run.id, errorMessage: 'Customer not found' });
    return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 500 });
  }

  // Handle based on status
  if (response.status === 'completed') {
    try {
      const { payload, rawText } = extractPayloadFromWebhook(response);
      
      await completeNewsletterGeneration({
        customer,
        runId: run.id,
        responseId,
        payload,
        rawText,
      });

      console.info(`[webhook] Successfully completed newsletter for ${customer.name} (runId=${run.id})`);
      return NextResponse.json({ ok: true, runId: run.id, status: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[webhook] Failed to complete newsletter for ${customer.name}:`, message);
      await markNewsletterFailed({ runId: run.id, errorMessage: message });
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  // Handle failure statuses
  if (response.status === 'failed' || response.status === 'cancelled' || response.status === 'expired') {
    const errorMessage = response.error?.message ?? `Research ${response.status}`;
    await markNewsletterFailed({ runId: run.id, errorMessage });
    console.warn(`[webhook] Research failed for ${customer.name}: ${errorMessage}`);
    return NextResponse.json({ ok: true, runId: run.id, status: 'error' });
  }

  // Unexpected status - log but don't fail
  console.warn(`[webhook] Unexpected status ${response.status} for responseId=${responseId}`);
  return NextResponse.json({ ok: true, message: `Unexpected status: ${response.status}` });
}

/**
 * GET /api/webhooks/openai
 * Health check endpoint for webhook verification
 */
export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    endpoint: 'OpenAI Deep Research Webhook',
    timestamp: new Date().toISOString(),
  });
}


