const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
let lastTestMessage = null;
function configured() {
  return env.mail.mode === 'json' || Boolean(env.mail.host && env.mail.user && env.mail.appPassword && env.mail.from);
}
function getTransporter() {
  if (transporter) return transporter;
  transporter = env.mail.mode === 'json'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ host: env.mail.host, port: env.mail.port, secure: env.mail.secure, auth: { user: env.mail.user, pass: env.mail.appPassword } });
  return transporter;
}
async function sendOfficerLoginCode({ to, code }) {
  if (!configured()) throw Object.assign(new Error('Officer email verification is not configured.'), { code: 'MAIL_NOT_CONFIGURED', status: 503 });
  const message = {
    from: env.mail.from || 'BLUEWRITE Security <no-reply@bluewrite.local>',
    to,
    subject: 'BLUEWRITE Login Verification Code',
    text: `Your BLUEWRITE verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share this code. If you did not attempt to sign in, contact your BLUEWRITE Administrator.`,
  };
  const result = await getTransporter().sendMail(message);
  if (env.mail.mode === 'json') lastTestMessage = { ...message };
  return result;
}
const getLastTestMessage = () => env.mail.mode === 'json' ? lastTestMessage : null;
module.exports = { configured, sendOfficerLoginCode, getLastTestMessage };