require('@next/env').loadEnvConfig(process.cwd());
const nodemailer = require('nodemailer');
const { smtpConfig } = require('../lib/email/smtp-config.cjs');
(async () => {
  let transport;
  try {
    transport = nodemailer.createTransport(smtpConfig());
    await transport.verify();
    console.log('SMTP: conexión, TLS y autenticación correctos. No se envió ningún correo.');
  } catch {
    console.error('SMTP: verificación fallida. Revisa las variables, el acceso SMTP de Zoho y la conectividad.');
    process.exitCode = 1;
  } finally { transport?.close(); }
})();
