import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as nodemailer from 'nodemailer';

interface ISendInviteRequest {
  signerEmail:  string;
  signerName:   string;
  contractName: string;
  signingUrl:   string;
  expiresAt:    string;
  emailHtml?:   string;
}

export async function sendInvite(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('[SendInvite] Request received');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') return { status: 200, headers };

  try {
    const body = await request.json() as ISendInviteRequest;
    const { signerEmail, signerName, contractName, signingUrl, expiresAt, emailHtml } = body;

    if (!signerEmail || !signerName || !contractName || !signingUrl) {
      return {
        status: 400, headers,
        jsonBody: { error: 'Missing required fields: signerEmail, signerName, contractName, signingUrl' },
      };
    }

    const gmailUser     = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      return {
        status: 500, headers,
        jsonBody: {
          error: 'Gmail not configured.',
          fix: 'Add GMAIL_USER and GMAIL_APP_PASSWORD to Azure Function App environment variables.',
        },
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword.replace(/\s/g, ''), // strip spaces if copy-pasted
      },
    });

    const html = emailHtml || buildEmailHTML({ signerName, signerEmail, contractName, signingUrl, expiresAt });

    context.log(`[SendInvite] Sending from ${gmailUser} → ${signerEmail}`);

    const info = await transporter.sendMail({
      from:    `"LegalLens E-Signature" <${gmailUser}>`,
      to:      `"${signerName}" <${signerEmail}>`,
      subject: `Please Sign: "${contractName}"`,
      html,
    });

    context.log(`[SendInvite] Email sent. MessageId: ${info.messageId}`);

    return {
      status: 200, headers,
      jsonBody: { success: true, message: `Invitation sent to ${signerEmail}` },
    };

  } catch (error: any) {
    context.error('[SendInvite] Error:', error);
    const msg: string = error.message || '';

    if (msg.includes('Invalid login') || msg.includes('Username and Password')) {
      return {
        status: 500, headers,
        jsonBody: {
          error: 'Gmail login failed.',
          fix: '1) Make sure 2-Step Verification is ON in your Google account. 2) Generate a fresh App Password at myaccount.google.com/apppasswords. 3) Set GMAIL_APP_PASSWORD in Azure Function environment variables (no spaces).',
          detail: msg,
        },
      };
    }
    if (msg.includes('self signed') || msg.includes('certificate')) {
      return {
        status: 500, headers,
        jsonBody: { error: 'TLS error. Try setting GMAIL_APP_PASSWORD again.', detail: msg },
      };
    }

    return { status: 500, headers, jsonBody: { error: msg } };
  }
}

function buildEmailHTML(p: {
  signerName: string;
  signerEmail: string;
  contractName: string;
  signingUrl: string;
  expiresAt: string;
}): string {
  const expiry = new Date(p.expiresAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px 36px;">
    <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">LegalLens E-Signature</div>
    <div style="font-size:24px;font-weight:800;color:#fff;">Signature Required</div>
  </div>

  <div style="padding:32px 36px;">
    <p style="color:#1e293b;font-size:15px;margin:0 0 14px;">Dear <strong>${p.signerName}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 22px;">
      You have been requested to review and electronically sign the following document:
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #6366f1;border-radius:8px;padding:16px 20px;margin:0 0 26px;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;">Document</div>
      <div style="font-size:17px;font-weight:700;color:#1e293b;">${p.contractName}</div>
    </div>

    <div style="text-align:center;margin:0 0 26px;">
      <a href="${p.signingUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
                text-decoration:none;font-weight:700;font-size:16px;padding:15px 40px;
                border-radius:10px;box-shadow:0 4px 14px rgba(99,102,241,0.35);">
        Review &amp; Sign Document &rarr;
      </a>
    </div>

    <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 22px;line-height:1.6;">
      This link expires on <strong>${expiry}</strong>.<br>
      No account needed &mdash; the signing page is publicly accessible.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:13px 16px;">
      <p style="color:#166534;font-size:12px;margin:0;line-height:1.6;">
        <strong>Secure &amp; single-use link</strong> &mdash; This invitation was sent specifically
        to <strong>${p.signerName}</strong>. The link expires automatically after signing.
      </p>
    </div>
  </div>

  <div style="background:#f8fafc;padding:16px 36px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
      Sent via LegalLens &middot; Powered by Budvik<br>
      If you did not expect this email, you can safely ignore it.
    </p>
  </div>
</div>
</body>
</html>`;
}

app.http('sendInvite', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sendInvite',
  handler: sendInvite,
});