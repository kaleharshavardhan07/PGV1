// Transactional email over SMTP. Built for Proton Mail's SMTP submission
// (smtp.protonmail.ch, a per-app SMTP token as the password; paid plan + custom
// domain), but any SMTP server works through the same env vars. Credentials come
// from the environment only; with none configured, mail is skipped (and logged),
// never an error, so the app works without it.
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let transport = null;

export const mailEnabled = () => Boolean(env.smtp.user && env.smtp.token);

const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465, // 587 upgrades with STARTTLS
      requireTLS: env.smtp.port !== 465,
      auth: { user: env.smtp.user, pass: env.smtp.token },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
  }
  return transport;
};

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

const layout = (title, bodyHtml) => `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
<div style="font-weight:700;color:#4f46e5;margin-bottom:16px">Aapka PG</div>
<h1 style="font-size:18px;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}</div>
<p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">You received this because of activity on your Aapka PG account.</p></div></body></html>`;

/** Fire-and-forget safe send. Resolves { sent, reason? } and never throws. */
export async function sendMail({ to, subject, text, html }) {
  if (!to) return { sent: false, reason: 'no recipient' };
  if (!mailEnabled()) {
    logger.info(`[mail skipped: SMTP not configured] to=${to} subject="${oneLine(subject)}"`);
    return { sent: false, reason: 'not configured' };
  }
  try {
    await getTransport().sendMail({ from: env.smtp.from, to, subject: oneLine(subject), text, html });
    return { sent: true };
  } catch (err) {
    logger.error(`mail failed: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

const appUrl = (path = '') => `${env.publicAppUrl}${path}`;

export const mail = {
  ownerPending: (owner, pg) =>
    sendMail({
      to: owner.email,
      subject: `Your Aapka PG registration is under review`,
      text: `Hi ${owner.fullName},\n\nYour PG "${pg.pgName}" has been submitted for admin approval. We will let you know when it is ready to use.\n\nYou can then log in at ${appUrl('/app/login')} with your PG username "${pg.pgUsername}".`,
      html: layout('Registration under review', `<p>Hi ${esc(owner.fullName)},</p><p><strong>${esc(pg.pgName)}</strong> has been submitted for admin approval.</p><p>We will let you know when it is ready to use. You can then <a href="${esc(appUrl('/app/login'))}" style="color:#4f46e5">open your dashboard</a>.</p>`),
    }),

  ownerWelcome: (owner, pg) =>
    sendMail({
      to: owner.email,
      subject: `Welcome to Aapka PG, ${owner.fullName}`,
      text: `Hi ${owner.fullName},\n\nYour PG "${pg.pgName}" is set up. Log in at ${appUrl('/app/login')} with your PG username "${pg.pgUsername}".\n\nNext: add your rooms and beds, then create tenant accounts.`,
      html: layout('Your PG is ready', `<p>Hi ${esc(owner.fullName)},</p><p><strong>${esc(pg.pgName)}</strong> is set up on Aapka PG.</p><p>Log in with PG username <strong>${esc(pg.pgUsername)}</strong>.</p><p><a href="${esc(appUrl('/app/login'))}" style="color:#4f46e5">Open your dashboard</a></p>`),
    }),

  newEnquiry: (ownerEmail, pgName, enquiry) =>
    sendMail({
      to: ownerEmail,
      subject: `New enquiry for ${pgName} from ${enquiry.name}`,
      text: `${enquiry.name} (${enquiry.mobile}${enquiry.email ? `, ${enquiry.email}` : ''}) is interested in ${pgName}.\n\n${enquiry.message || '(no message)'}\n\nReply from your dashboard: ${appUrl('/app/owner/enquiries')}`,
      html: layout('New enquiry', `<p><strong>${esc(enquiry.name)}</strong> is interested in ${esc(pgName)}.</p><p>Mobile: ${esc(enquiry.mobile)}<br>${enquiry.email ? `Email: ${esc(enquiry.email)}` : ''}</p><blockquote style="margin:12px 0;padding:10px 14px;background:#f1f5f9;border-radius:8px">${esc(enquiry.message || '(no message)')}</blockquote><p><a href="${esc(appUrl('/app/owner/enquiries'))}" style="color:#4f46e5">View in dashboard</a></p>`),
    }),

  // Passwords are never emailed: staff share credentials with the new user directly.
  accountCreated: (ownerEmail, kind, name, pgName) =>
    sendMail({
      to: ownerEmail,
      subject: `${kind} account created: ${name}`,
      text: `A ${kind.toLowerCase()} account was created for ${name} at ${pgName}. Share their login details with them directly; passwords are never sent by email.`,
      html: layout(`${kind} account created`, `<p>A ${esc(kind.toLowerCase())} account was created for <strong>${esc(name)}</strong> at ${esc(pgName)}.</p><p>Share their login details with them directly. Passwords are never sent by email.</p>`),
    }),
};
