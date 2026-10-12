const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const translations = require('../components/i18n/es.json');

// Exercise the real component handlers, using the same small hook harness approach as chat-booking.
function mount(fetcher) {
  let cursor = 0, closed = 0;
  const hooks = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: initial }; return hooks[i]; },
  };
  const jsx = (type, props) => ({ type, props });
  const context = { exports: {}, crypto: require('node:crypto').webcrypto, fetch: fetcher,
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key]; } },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '../i18n/LanguageProvider') return { useLanguage: () => ({ t: value => translations[value] || value }) };
      if (name === '../ui/SectionIndex') return { default: 'index' };
      if (name === '@/lib/project-form') return { projectServices: { 'AI agents': 'Agentes de IA' } };
      throw new Error(name);
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/sections/Contact.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  function render() { cursor = 0; return context.exports.default(); }
  function nodes(node = render()) { if (Array.isArray(node)) return node.flatMap(nodes); return node && typeof node === 'object' ? [node, ...nodes(node.props?.children ?? null)] : []; }
  function text(node = render()) { if (Array.isArray(node)) return node.map(text).join(' '); return node && typeof node === 'object' ? text(node.props?.children ?? '') : String(node ?? ''); }
  render(); hooks[0].current = { close: () => closed++, showModal() {} };
  const values = { name: 'Ana', email: 'ana@example.com', company: '', service: 'AI agents', project: 'Nuevo proyecto' };
  return { nodes, text, closed: () => closed, submit: () => nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: values }) };
}
const response = confirmation => ({ ok: true, json: async () => ({ leadSaved: true, emails: { confirmation } }) });

test('modal blocks double submit immediately, shows progress and stays open on success', async () => {
  const calls = []; let finish;
  const h = mount((url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Promise(resolve => { finish = resolve; }); });
  const first = h.submit(); await h.submit();
  assert.equal(calls.length, 1); assert.equal(calls[0].url, '/api/leads/project');
  assert.match(h.text(), /ENVIANDO SOLICITUD/);
  assert.equal(h.nodes().find(n => n.props?.type === 'submit').props.disabled, true);
  finish(response('sent')); await first;
  assert.match(h.text(), /SOLICITUD RECIBIDA/); assert.match(h.text(), /Te enviamos una confirmación a/); assert.match(h.text(), /ana@example.com/);
  assert.equal(h.closed(), 0); h.nodes().find(n => n.type === 'button' && n.props.children === 'CERRAR').props.onClick(); assert.equal(h.closed(), 1);
});
test('saved request with failed or unknown SMTP never claims confirmation was sent', async () => {
  for (const status of ['failed', 'unknown']) { const h = mount(async () => response(status)); await h.submit(); assert.match(h.text(), /SOLICITUD RECIBIDA/); assert.match(h.text(), /No pudimos confirmar el envío/); assert.doesNotMatch(h.text(), /Te enviamos una confirmación a/); }
});
test('network retry preserves request identity and allows recovery', async () => {
  const ids = [];
  const h = mount(async (_url, options) => { ids.push(JSON.parse(options.body).requestId); if (ids.length === 1) throw new Error('Network failure'); return response('unknown'); });
  await h.submit(); assert.match(h.text(), /No pudimos confirmar la recepción/);
  await h.submit(); assert.equal(ids[0], ids[1]); assert.match(h.text(), /SOLICITUD RECIBIDA/);
});
