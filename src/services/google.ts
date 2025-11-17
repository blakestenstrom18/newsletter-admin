import { google } from 'googleapis';
import { env } from '@/lib/env';
import { NewsletterContent } from '@/lib/types';

function getAuth() {
  // Google Drive is optional - check if credentials are available
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Drive credentials not configured. This feature is optional.');
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
  return auth;
}

export async function ensureCustomerFolder(customerName: string) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  if (!env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID is required for Google Drive integration');
  }

  const q = `'${env.GOOGLE_DRIVE_PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${customerName.replace(/'/g, "\\'")}' and trashed = false`;
  const search = await drive.files.list({ q, fields: 'files(id, name)' });
  if (search.data.files && search.data.files.length > 0) return search.data.files[0]!.id!;

  const create = await drive.files.create({
    requestBody: {
      name: customerName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [env.GOOGLE_DRIVE_PARENT_FOLDER_ID],
    },
    fields: 'id',
  });
  return create.data.id!;
}

export async function createNewsletterDoc(opts: {
  customerName: string;
  content: NewsletterContent;
}) {
  if (!env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID is required for Google Drive integration');
  }

  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  const folderId = await ensureCustomerFolder(opts.customerName);
  const date = new Date().toISOString().slice(0, 10);
  const name = `${opts.customerName} – Biweekly Newsletter – ${date}`;

  const file = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.document',
      parents: [folderId],
    },
    fields: 'id, webViewLink',
  });

  const documentId = file.data.id!;
  const text = renderPlainText(opts.customerName, opts.content);

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            text,
            endOfSegmentLocation: { segmentId: '' },
          },
        },
      ],
    },
  });

  // Return URL
  const doc = await drive.files.get({ fileId: documentId, fields: 'webViewLink' });
  return { documentId, url: doc.data.webViewLink! };
}

function renderPlainText(customerName: string, c: NewsletterContent) {
  const lines: string[] = [];
  lines.push(`${customerName} — Executive Newsletter`);
  lines.push(`Generated: ${c.generatedAtIso}`);
  lines.push('');
  lines.push('Executive Summary');
  lines.push(c.executiveSummary);
  lines.push('');

  lines.push(`1) What's New For You`);
  for (const h of c.customerHighlights) {
    lines.push(`• ${h.summary} (${h.sourceUrl ?? 'source'})`);
    lines.push(`  Implication for ${customerName}: ${h.implication}`);
  }
  lines.push('');

  lines.push(`2) Industry Trends We're Watching`);
  for (const t of c.industryTrends) {
    lines.push(`• ${t.trend} (${t.sourceUrl ?? 'source'})`);
    lines.push(`  Why it matters: ${t.implication}`);
  }
  lines.push('');

  lines.push(`3) Updates from Iterate.ai`);
  for (const u of c.iterateUpdates) lines.push(`• ${u.update}${u.sourceUrl ? ` (${u.sourceUrl})` : ''}`);
  lines.push('');

  lines.push(`4) Ideas for Future Collaboration`);
  for (const i of c.futureIdeas) lines.push(`• ${i.idea} — Value: ${i.value}`);
  lines.push('');

  return lines.join('\n');
}

