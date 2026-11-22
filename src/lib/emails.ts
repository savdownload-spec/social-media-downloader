import 'server-only';
import nodemailer from 'nodemailer';
import { siteConfig } from '@/config/site';

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export type ResolvedEmail =
  | { sent: true }
  | { sent: false; reason: 'no-smtp' | 'no-config' | 'resend'; previewText: string };

/**
 * Sends an email via Resend (when RESEND_API_KEY is set) or SMTP (when
 * SMTP_HOST/USER/PASS are set). In development with neither configured the
 * message is NOT sent — it is returned so callers can log/display it.
 */
export async function sendEmail(args: SendEmailArgs): Promise<ResolvedEmail> {
  const previewText = [`To: ${args.to}`, `Subject: ${args.subject}`, '', args.text].join('\n');

  // ── Resend path (takes priority over SMTP) ──────────────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const from =
        process.env.RESEND_FROM_EMAIL ??
        process.env.SMTP_FROM ??
        `"${siteConfig.name}" <noreply@getsavdown.com>`;
      const payload: Parameters<typeof resend.emails.send>[0] = {
        from,
        to: [args.to],
        subject: args.subject,
        text: args.text,
      };
      if (args.html) payload.html = args.html;
      if (args.replyTo) payload.replyTo = args.replyTo;

      await resend.emails.send(payload);
      return { sent: true };
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      console.error('[email] Resend send failed:', code);
      return { sent: false, reason: 'resend', previewText };
    }
  }

  // ── SMTP / nodemailer path ───────────────────────────────────────────────
  const transporter = getTransporter();

  if (!transporter) {
    return { sent: false, reason: 'no-config', previewText };
  }

  const from = process.env.SMTP_FROM || `"${siteConfig.name}" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: args.to,
    replyTo: args.replyTo,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { sent: true };
}

// ── Contact notification emails ──────────────────────────────────────────────

function contactNotificationHtml(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New Contact Enquiry — SavDown</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr><td style="background:linear-gradient(135deg,#6C47FF,#A855F7);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Contact Enquiry</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">SavDown — ${data.submittedAt}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">Name</p>
              <p style="margin:0;font-size:15px;color:#1a1a2e;">${escapeHtml(data.name || '(not provided)')}</p>
            </td></tr>
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">Email</p>
              <p style="margin:0;font-size:15px;color:#1a1a2e;"><a href="mailto:${escapeHtml(data.email)}" style="color:#6C47FF;">${escapeHtml(data.email)}</a></p>
            </td></tr>
            ${data.subject ? `<tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">Subject</p>
              <p style="margin:0;font-size:15px;color:#1a1a2e;">${escapeHtml(data.subject)}</p>
            </td></tr>` : ''}
            <tr><td style="padding:0 0 8px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;">Message</p>
              <div style="background:#f9f9fb;border-radius:8px;padding:16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">This message was submitted via the SavDown Contact Us form. Reply to this email to respond directly to ${escapeHtml(data.name || 'the visitor')}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function contactNotificationText(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
}): string {
  return [
    'NEW CONTACT ENQUIRY — SavDown',
    `Received: ${data.submittedAt}`,
    '',
    `Name:    ${data.name || '(not provided)'}`,
    `Email:   ${data.email}`,
    data.subject ? `Subject: ${data.subject}` : '',
    '',
    'Message:',
    data.message,
    '',
    '---',
    'Reply to this email to respond directly to the visitor.',
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

function contactAcknowledgementHtml(data: { name: string }): string {
  const firstName = (data.name || 'there').split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>We received your message — SavDown</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
        <tr><td style="background:linear-gradient(135deg,#6C47FF,#A855F7);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">We got your message ✓</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">SavDown Support</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">Thanks for reaching out. We have received your message and someone from the SavDown team will review it.</p>
          <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">If you have anything to add, just reply to this email.</p>
          <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">— The SavDown Team</p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">You are receiving this because you submitted a message via <a href="https://getsavdown.com/contact" style="color:#6C47FF;">getsavdown.com/contact</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function contactAcknowledgementText(data: { name: string }): string {
  const firstName = (data.name || 'there').split(' ')[0];
  return [
    `Hi ${firstName},`,
    '',
    "Thanks for reaching out. We have received your message and someone from the SavDown team will review it.",
    '',
    'If you have anything to add, just reply to this email.',
    '',
    '— The SavDown Team',
    '',
    '---',
    'You received this because you submitted a message via getsavdown.com/contact.',
  ].join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type ContactNotificationResult = {
  notificationSent: boolean;
  acknowledgementSent: boolean;
};

/**
 * Sends two emails for a Contact Us submission:
 * 1. Notification to info@getsavdown.com (or RESEND_CONTACT_RECIPIENT).
 * 2. Acknowledgement to the visitor.
 *
 * Each send is independently caught. A failure of one does not suppress the
 * other. When no email provider is configured both return sent: false.
 */
export async function sendContactNotification(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}): Promise<ContactNotificationResult> {
  const recipient =
    process.env.RESEND_CONTACT_RECIPIENT ?? 'info@getsavdown.com';
  const submittedAt = data.createdAt.toUTCString();
  const subjectLine = data.subject
    ? `[SavDown Contact] ${data.subject}`
    : `[SavDown Contact] New enquiry from ${data.name || data.email}`;

  const [notificationResult, acknowledgementResult] = await Promise.all([
    sendEmail({
      to: recipient,
      replyTo: data.email,
      subject: subjectLine,
      html: contactNotificationHtml({ ...data, submittedAt }),
      text: contactNotificationText({ ...data, submittedAt }),
    }).catch((err) => {
      console.error('[contact] notification send error:', err instanceof Error ? err.message : err);
      return { sent: false } as ResolvedEmail;
    }),
    sendEmail({
      to: data.email,
      subject: 'We received your message \u2013 SavDown',
      html: contactAcknowledgementHtml({ name: data.name }),
      text: contactAcknowledgementText({ name: data.name }),
    }).catch((err) => {
      console.error('[contact] acknowledgement send error:', err instanceof Error ? err.message : err);
      return { sent: false } as ResolvedEmail;
    }),
  ]);

  return {
    notificationSent: notificationResult.sent,
    acknowledgementSent: acknowledgementResult.sent,
  };
}
