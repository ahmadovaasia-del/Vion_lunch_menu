import "server-only";
import nodemailer from "nodemailer";

// Отправка писем через любой SMTP: Gmail, Resend, Microsoft 365 и т.п.
// Те же настройки SMTP указываются в Supabase для писем входа.
export async function sendMail(msg: { to: string[]; cc?: string[]; subject: string; html: string; text: string }) {
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: msg.to,
    cc: msg.cc?.length ? msg.cc : undefined,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}
