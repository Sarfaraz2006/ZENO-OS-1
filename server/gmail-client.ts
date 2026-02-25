// Gmail Integration via Replit Connector (OAuth)
// Never cache the client - tokens expire
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function getGmailProfile(): Promise<{ email: string; messagesTotal: number }> {
  const gmail = await getUncachableGmailClient();
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return {
    email: profile.data.emailAddress || '',
    messagesTotal: profile.data.messagesTotal || 0,
  };
}

export async function sendGmailEmail(to: string, subject: string, body: string, replyToMessageId?: string): Promise<{ id: string; threadId: string }> {
  const gmail = await getUncachableGmailClient();
  const profile = await gmail.users.getProfile({ userId: 'me' });
  const from = profile.data.emailAddress || '';

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];

  if (replyToMessageId) {
    headers.push(`In-Reply-To: ${replyToMessageId}`);
    headers.push(`References: ${replyToMessageId}`);
  }

  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
  const encodedMessage = Buffer.from(rawMessage).toString('base64url');

  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: result.data.id || '',
    threadId: result.data.threadId || '',
  };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function getHeader(headers: any[], name: string): string {
  const h = headers?.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function extractBody(payload: any): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return decodeBase64Url(part.body.data).replace(/<[^>]*>/g, '');
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

export async function fetchGmailInbox(maxResults: number = 20): Promise<GmailMessage[]> {
  const gmail = await getUncachableGmailClient();
  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
  });

  if (!list.data.messages || list.data.messages.length === 0) return [];

  const messages: GmailMessage[] = [];
  for (const msg of list.data.messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      const headers = full.data.payload?.headers || [];
      messages.push({
        id: full.data.id || '',
        threadId: full.data.threadId || '',
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        body: extractBody(full.data.payload),
        date: getHeader(headers, 'Date'),
        snippet: full.data.snippet || '',
        labelIds: full.data.labelIds || [],
      });
    } catch (err) {
      console.error('Error fetching message:', msg.id, err);
    }
  }

  return messages;
}

export async function fetchGmailThread(threadId: string): Promise<GmailMessage[]> {
  const gmail = await getUncachableGmailClient();
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  return (thread.data.messages || []).map((msg: any) => {
    const headers = msg.payload?.headers || [];
    return {
      id: msg.id || '',
      threadId: msg.threadId || '',
      from: getHeader(headers, 'From'),
      to: getHeader(headers, 'To'),
      subject: getHeader(headers, 'Subject'),
      body: extractBody(msg.payload),
      date: getHeader(headers, 'Date'),
      snippet: msg.snippet || '',
      labelIds: msg.labelIds || [],
    };
  });
}
