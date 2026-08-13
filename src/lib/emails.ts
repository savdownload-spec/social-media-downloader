import nodemailer from 'nodemailer';
import { siteConfig } from '@/config/site';

type SendEmailArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
  | { sent: false; reason: 'no-smtp'; previewText: string };

/**
 * Sends an email via SMTP when configured. In development (or any deployment
 * without SMTP_* vars) the message is NOT sent, it is returned so the caller
 * can log/display it, keeping the flow testable without an email provider.
 */
export async function sendEmail(args: SendEmailArgs): Promise<ResolvedEmail> {
  const transporter = getTransporter();

  if (!transporter) {
    const previewText = [
      `To: ${args.to}`,
      `Subject: ${args.subject}`,
      '',
      args.text,
    ].join('\n');
    return { sent: false, reason: 'no-smtp', previewText };
  }

  const from = process.env.SMTP_FROM || `"${siteConfig.name}" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });

  return { sent: true };
}
