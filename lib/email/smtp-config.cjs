// Shared by the server mailer and the credential-safe verification command.
function smtpConfig(env = process.env) {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'MAIL_TO_CONTACT'];
  if (required.some(key => !env[key])) throw new Error('SMTP_CONFIG');
  if (!/^[a-z0-9.-]+$/i.test(env.SMTP_HOST) || !['true', 'false'].includes(env.SMTP_SECURE) ||
      !['465', '587'].includes(env.SMTP_PORT) || (env.SMTP_PORT === '465') !== (env.SMTP_SECURE === 'true') ||
      env.MAIL_FROM !== 'FULCRUM <contacto@fulcrum.com.pe>' || env.MAIL_TO_CONTACT !== 'contacto@fulcrum.com.pe' ||
      /[\r\n]/.test(env.SMTP_USER)) throw new Error('SMTP_CONFIG');
  return {
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT), secure: env.SMTP_SECURE === 'true', requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  };
}
module.exports = { smtpConfig };
