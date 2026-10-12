const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const context = { exports: {}, Buffer, console: mocks.console || console, process, require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
      if (name.startsWith('.')) return name.endsWith('.cjs') ? require(path.resolve(path.dirname(absolute), name)) : load(path.resolve(path.dirname(absolute), `${name}.ts`));
      return require(name);
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
    cache.set(absolute, context.exports);
    return context.exports;
  }
  return load;
}
const valid = { requestId: '31415926-5358-4979-8323-846264338327', name: 'Ana', email: 'ana@example.com', company: 'Empresa', service: 'AI agents', requirement: 'Necesitamos automatizar las solicitudes.' };
function harness({ failure, dbFailure } = {}) {
  const rows = new Map(), mail = [], logs = [];
  const load = loader({
    '@/lib/prisma': { prisma: { lead: {
      async create({ data }) {
        if (dbFailure) throw new Error('database-secret');
        if (rows.has(data.requestId)) throw { code: 'P2002' };
        const row = { ...data, id: rows.size + 1, createdAt: new Date('2026-10-12T12:00:00Z') }; rows.set(data.requestId, row); return row;
      },
      async findUnique({ where }) { return rows.get(where.requestId); },
    } } },
    '@/lib/email/mailer': { contactRecipient: () => 'contacto@fulcrum.com.pe', sendMail: async message => { assert.equal(rows.size, 1); mail.push(message); if (failure === 'all' || failure === message.to) throw new Error('smtp-password-secret'); } },
    console: { error: (...args) => logs.push(args) },
  });
  const { POST } = load('app/api/leads/project/route.ts');
  return { rows, mail, logs, post: (body = valid, raw = false, type = 'application/json') => POST(new Request('http://localhost/api/leads/project', { method: 'POST', headers: { 'Content-Type': type }, body: raw ? body : JSON.stringify(body) })) };
}

test('valid request persists the CRM lead before both emails, with fixed source and status', async () => {
  const h = harness(); const response = await h.post(); const result = await response.json();
  assert.equal(response.status, 201); assert.equal(result.leadSaved, true);
  const row = [...h.rows.values()][0]; assert.equal(row.source, 'project-form'); assert.equal(row.status, 'NUEVO'); assert.equal(row.service, 'Agentes de IA'); assert.equal(row.aiSummary, undefined);
  assert.equal(h.mail[0].to, 'contacto@fulcrum.com.pe'); assert.equal(h.mail[0].replyTo, valid.email); assert.match(h.mail[0].text, /ID DEL LEAD: 1/); assert.match(h.mail[0].text, /2026-10-12/);
  assert.equal(h.mail[1].to, valid.email); assert.equal(h.mail[1].subject, 'FULCRUM — Hemos recibido tu proyecto'); assert.match(h.mail[1].html, /Ana/);
  assert.deepEqual(result.emails, { internal: 'sent', confirmation: 'sent' });
});
test('strict validation rejects missing fields, invalid emails, types, headers and lengths before writing', async () => {
  const h = harness();
  const bad = [null, [], { ...valid, email: 'invalid' }, { ...valid, email: 'a@b.com\r\nBcc: x@y.com' }, { ...valid, name: 'A\r\nB' }, { ...valid, name: 'x'.repeat(101) }, { ...valid, company: 4 }, { ...valid, company: 'x'.repeat(161) }, { ...valid, requirement: 'x'.repeat(4001) }, { ...valid, service: 'random' }, { ...valid, requestId: 'bad' }, { ...valid, to: 'other@example.com' }, { ...valid, source: 'chatbot' }];
  for (const key of ['name', 'email', 'service', 'requirement', 'requestId']) { const input = { ...valid }; delete input[key]; bad.push(input); bad.push({ ...valid, [key]: ' ' }); }
  for (const input of bad) assert.equal((await h.post(input)).status, 400);
  assert.equal((await h.post('{', true)).status, 400);
  assert.equal((await h.post('x'.repeat(32769), true)).status, 413);
  assert.equal((await h.post(valid, false, 'text/plain')).status, 415);
  assert.equal(h.rows.size, 0); assert.equal(h.mail.length, 0);
});
test('company is optional', async () => { const h = harness(); const input = { ...valid }; delete input.company; assert.equal((await h.post(input)).status, 201); assert.equal([...h.rows.values()][0].company, null); });
test('SMTP failure preserves lead and never exposes errors or claims delivery', async () => {
  const h = harness({ failure: 'all' }); const result = await (await h.post()).json();
  assert.equal(h.rows.size, 1); assert.equal(h.mail.length, 2); assert.equal(result.leadSaved, true); assert.deepEqual(result.emails, { internal: 'failed', confirmation: 'failed' });
  assert.doesNotMatch(JSON.stringify([result, h.logs]), /smtp-password-secret/);
});
test('independent email outcomes are reported', async () => {
  for (const recipient of ['contacto@fulcrum.com.pe', valid.email]) {
    const h = harness({ failure: recipient }); const result = await (await h.post()).json();
    assert.equal(result.emails.internal, recipient === valid.email ? 'sent' : 'failed');
    assert.equal(result.emails.confirmation, recipient === valid.email ? 'failed' : 'sent');
  }
});
test('parallel and repeated submissions create one lead and one pair of emails', async () => {
  const h = harness(); const responses = await Promise.all([h.post(), h.post(), h.post()]);
  assert.equal(h.rows.size, 1); assert.equal(h.mail.length, 2);
  assert.deepEqual(responses.map(r => r.status), [201, 200, 200]);
  assert.equal((await responses[1].json()).emails.confirmation, 'unknown');
  assert.equal((await h.post({ ...valid, name: 'Other' })).status, 409);
});
test('database failure sends no emails and exposes no diagnostics', async () => {
  const h = harness({ dbFailure: true }); const response = await h.post(); assert.equal(response.status, 500); assert.equal(h.mail.length, 0); assert.doesNotMatch(await response.text(), /database-secret/);
});
test('both HTML templates escape user content and have plain text alternatives', async () => {
  const h = harness(); await h.post({ ...valid, name: '<script>alert("x")</script>', company: "A & B's", requirement: '<img src=x onerror=alert(1)>\nSecond line' });
  for (const message of h.mail) { assert.doesNotMatch(message.html, /<script>|<img src=x/); assert.match(message.html, /&lt;/); assert.match(message.html, /A &amp; B&#39;s/); assert.match(message.text, /Second line/); assert.match(message.html, /<table/); }
});

const { smtpConfig } = require('../lib/email/smtp-config.cjs');
const config = { SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'contacto@fulcrum.com.pe', SMTP_PASSWORD: 'test-only', MAIL_FROM: 'FULCRUM <contacto@fulcrum.com.pe>', MAIL_TO_CONTACT: 'contacto@fulcrum.com.pe' };
test('SMTP configuration requires credentials, fixed addresses and TLS', () => {
  assert.throws(() => smtpConfig({}), /SMTP_CONFIG/);
  const result = smtpConfig(config); assert.equal(result.secure, true); assert.equal(result.logger, false); assert.equal(result.disableFileAccess, true);
  assert.equal(smtpConfig({ ...config, SMTP_PORT: '587', SMTP_SECURE: 'false' }).requireTLS, true);
  for (const change of [{ SMTP_PORT: '25' }, { SMTP_SECURE: 'false' }, { MAIL_FROM: 'attacker@example.com' }, { MAIL_TO_CONTACT: 'other@example.com' }]) assert.throws(() => smtpConfig({ ...config, ...change }));
});
test('real mailer passes server FROM and detects rejected messages', async () => {
  const saved = { ...process.env }; Object.assign(process.env, config);
  let message, options, closed = 0, reject = false;
  const load = loader({ nodemailer: { createTransport: value => { options = value; return { sendMail: async value => { message = value; return { accepted: reject ? [] : [value.to], rejected: reject ? [value.to] : [] }; }, close: () => closed++ }; } } });
  try {
    const { sendMail } = load('lib/email/mailer.ts');
    await sendMail({ to: valid.email, subject: 'Test', html: '<p>Test</p>', text: 'Test' });
    assert.equal(message.from, config.MAIL_FROM); assert.equal(options.auth.pass, 'test-only'); assert.equal(closed, 1);
    reject = true; await assert.rejects(sendMail({ to: valid.email, subject: 'Test', html: '', text: '' }), /MAIL_REJECTED/);
    await assert.rejects(sendMail({ to: 'x@y.com\r\nBcc: a@b.com', subject: 'Test', html: '', text: '' }), /INVALID_MAIL/);
  } finally { for (const key of Object.keys(config)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } }
});
