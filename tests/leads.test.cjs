const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const requestId = '31415926-5358-4979-8323-846264338327';
const body = { requestId, requirement: 'Solicitudes de carga y trazos de rutas', phone: ' 965874879 ' };

function api({ lostFirstResponse = false, environment = 'test', failure = null } = {}) {
  const records = new Map(), logs = [];
  let writes = 0;
  const prisma = { lead: {
    async upsert({ where, create, update }) {
      if (failure) throw failure;
      let row = records.get(where.requestId);
      if (!row) { row = { id: ++writes, ...create }; records.set(where.requestId, row); }
      else Object.assign(row, update);
      if (lostFirstResponse) { lostFirstResponse = false; throw new Error('Response lost after commit'); }
      return row;
    },
    async create({ data }) { if (failure) throw failure; const row = { id: ++writes, ...data }; records.set(row.id, row); return row; },
  } };
  const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/api/leads/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
  const context = { exports: {}, process: { env: { NODE_ENV: environment } }, console: { error: (...args) => logs.push(args) }, require: name => name === '@/lib/prisma' ? { prisma } : require(name) };
  vm.runInNewContext(output, context);
  return { records, logs, post: value => context.exports.POST(new Request('http://localhost/api/leads', { method: 'POST', body: JSON.stringify(value) })) };
}

test('nine-digit Peruvian phone is trimmed and stored as a string without requiring a name', async () => {
  const h = api(); const result = await h.post(body); const data = await result.json();
  assert.equal(result.status, 201); assert.equal(data.lead.phone, '965874879');
  assert.equal(typeof data.lead.phone, 'string'); assert.equal(data.lead.name, null);
});

test('lost response followed by Jorge returns and enriches the same lead', async () => {
  const h = api({ lostFirstResponse: true });
  assert.equal((await h.post(body)).status, 500);
  const result = await h.post({ ...body, name: 'Jorge' });
  const data = await result.json();
  assert.equal(result.status, 201); assert.equal(data.lead.id, 1); assert.equal(data.lead.name, 'Jorge');
  assert.equal(data.lead.phone, '965874879'); assert.equal(h.records.size, 1);
});

test('parallel identical request keys resolve to one record, new conversations use another key', async () => {
  const h = api(); const results = await Promise.all([h.post(body), h.post(body)]);
  assert.equal(h.records.size, 1);
  assert.equal((await results[0].json()).lead.id, (await results[1].json()).lead.id);
  await h.post({ ...body, requestId: '41415926-5358-4979-8323-846264338327' }); assert.equal(h.records.size, 2);
});

test('validation rejects numeric phone and insufficient data before persistence', async () => {
  const h = api();
  for (const input of [{ ...body, phone: 965874879 }, { phone: '965874879' }, { requirement: 'Transport' }, { ...body, requestId: 'bad' }]) assert.equal((await h.post(input)).status, 400);
  assert.equal(h.records.size, 0);
});

test('diagnostics log only safe codes in development and no secrets', async () => {
  const failure = Object.assign(new Error('postgres://secret-password token-sentinel'), { code: 'P1001', meta: { secret: 'token-sentinel' } });
  const dev = api({ environment: 'development', failure });
  const response = await dev.post(body);
  assert.equal(response.status, 500); assert.equal(dev.logs.length, 1);
  assert.match(JSON.stringify(dev.logs), /P1001/); assert.doesNotMatch(JSON.stringify(dev.logs), /password|sentinel|postgres:\/\//);
  assert.doesNotMatch(await response.text(), /P1001|password|sentinel/);
  const production = api({ environment: 'production', failure }); await production.post(body); assert.equal(production.logs.length, 0);
});
