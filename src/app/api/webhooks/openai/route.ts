import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletterRun, customerConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { completeNewsletterGeneration, markNewsletterFailed } from '@/services/newsletter';
import { extractPayloadFromWebhook } from '@/services/deepResearch';

export const runtime = 'nodejs';

// OpenAI webhook event structure
type WebhookEvent = {
  id: string;           // Event ID (evt_xxx)
  type: string;         // e.g., "response.completed", "response.failed"
  data: {
    id: string;         // Response ID (resp_xxx) - this is what we stored
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
};

/**
 * POST /api/webhooks/openai
 * Webhook endpoint that OpenAI calls when a deep research background task completes.
 * Configure this URL in your OpenAI dashboard under Webhooks.
 */
export async function POST(req: NextRequest) {
  // Log headers for debugging
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!key.toLowerCase().includes('secret') && !key.toLowerCase().includes('auth') && !key.toLowerCase().includes('token')) {
      headers[key] = value;
    }
  });
  console.info('[webhook] Received request with headers:', JSON.stringify(headers));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.error('[webhook] Failed to parse request body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Log the full body for debugging
  console.info('[webhook] Received body:', JSON.stringify(body));

  // OpenAI sends events with the response nested in `data`
  const event = body as WebhookEvent;
  
  // Extract the actual response from the event data
  const eventId = event?.id;
  const eventType = event?.type;
  const response = event?.data;
  const responseId = response?.id;

  console.info(`[webhook] Event: id=${eventId}, type=${eventType}, responseId=${responseId}`);

  if (!responseId) {
    console.error('[webhook] Missing response ID in payload. Event structure:', JSON.stringify(event));
    return NextResponse.json({ error: 'Missing response ID' }, { status: 400 });
  }

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

  console.info(`[webhook] Found run ${run.id} for customer ${run.customerId}`);

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

  // Handle based on event type
  if (eventType === 'response.completed') {
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

  // Handle failure event types
  if (eventType === 'response.failed' || eventType === 'response.cancelled' || eventType === 'response.incomplete') {
    const errorMessage = response?.error?.message ?? `Research ${eventType.replace('response.', '')}`;
    await markNewsletterFailed({ runId: run.id, errorMessage });
    console.warn(`[webhook] Research failed for ${customer.name}: ${errorMessage}`);
    return NextResponse.json({ ok: true, runId: run.id, status: 'error' });
  }

  // Unexpected event type - log but don't fail
  console.warn(`[webhook] Unexpected event type ${eventType} for responseId=${responseId}`);
  return NextResponse.json({ ok: true, message: `Unexpected event type: ${eventType}` });
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
