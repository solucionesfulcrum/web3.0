const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Small hook harness: exercise the real component handlers without adding a
// browser/test framework dependency. All network traffic is simulated.
function mount(file, initialProps, fetcher) {
  let cursor = 0, props = initialProps;
  const hooks = [], cache = new Map();
  const react = {
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === "function" ? initial() : initial; return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
    useRef(initial) { const [ref] = react.useState(() => ({ current: initial })); return ref; },
    useId() { return `test-${cursor++}`; },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "..", relative), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const sandbox = { exports: {}, Intl, Date, URL, AbortController, crypto: require('node:crypto').webcrypto, process: { env: { NODE_ENV: 'test' } }, fetch: fetcher, window: { setTimeout, clearTimeout }, require(name) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (name.endsWith(".css")) return {};
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
      if (name === "./chat/ChatBooking") return { __esModule: true, default: function ChatBooking() {} };
      return require(name);
    } };
    vm.runInNewContext(code, sandbox); cache.set(relative, sandbox.exports); return sandbox.exports;
  }
  const Component = load(file).default;
  function render(next) { if (next) props = { ...props, ...next }; cursor = 0; return Component(props); }
  function nodes(node = render()) {
    if (Array.isArray(node)) return node.flatMap(item => nodes(item));
    if (!node || typeof node !== "object") return [];
    return [node, ...nodes(node.props?.children ?? null)];
  }
  function text(node) { if (Array.isArray(node)) return node.map(text).join(" "); return typeof node === "object" && node ? text(node.props?.children) : typeof node === "string" || typeof node === "number" ? String(node) : ""; }
  function button(label) { const item = nodes().find(node => node.type === "button" && text(node) === label); assert.ok(item, `Missing button: ${label}`); return item; }
  return { render, nodes, text: () => text(render()), button, load, click: label => button(label).props.onClick() };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const component = "components/chat/ChatBooking.tsx";
const base = { leadId: 21, name: "Test", email: "person@example.test", open: true, onEmail() {}, onBusy() {} };
function dates(h) { return h.nodes().filter(node => node.type === "button" && "aria-pressed" in node.props); }
function slot(date, label = "15:30") { return { start: `${date}T${label}:00-05:00`, end: `${date}T16:00:00-05:00`, label }; }

test("calendar date labels use Lima, span seven calendar days and exclude weekends", () => {
  const lib = mount(component, base, () => {}).load("lib/chat-booking.ts");
  const days = lib.bookingDates(new Date("2026-10-16T02:00:00Z"));
  assert.deepEqual(Array.from(days), ["2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20", "2026-10-21"]);
  assert.match(lib.bookingDateLabel("2026-10-15T20:30:00Z"), /jueves,? 15 de octubre/);
  assert.match(lib.bookingTimeLabel("2026-10-15T15:30:00-05:00"), /3:30/);
  assert.equal(lib.safeBookingLink("javascript:alert(1)"), null);
});

test("confirmed booking sends the exact API slot and existing lead, prevents duplicate clicks", async () => {
  const requests = []; let chosen;
  const h = mount(component, base, async (url, options) => {
    requests.push({ url, options });
    if (url.includes("availability")) { chosen = slot(new URL(url, "http://local").searchParams.get("date")); return response({ success: true, slots: [chosen] }); }
    return response({ success: true, meeting: { startAt: chosen.start, endAt: chosen.end, meetUrl: "https://meet.google.com/test", calendarHtmlUrl: "https://calendar.google.com/test" } }, 201);
  });
  h.click("Agendar reunión"); assert.doesNotMatch(h.text(), /¿Cuál podemos usar/);
  await dates(h)[0].props.onClick(); await settle();
  h.click("15:30"); assert.equal(requests.length, 1);
  const confirm = h.button("Confirmar reunión").props.onClick;
  confirm(); confirm(); await settle();
  assert.equal(requests.length, 2);
  assert.deepEqual(JSON.parse(requests[1].options.body), { leadId: 21, name: "Test", email: base.email, start: chosen.start });
  assert.match(h.text(), /Tu reunión quedó agendada correctamente/);
  assert.ok(!h.nodes().some(node => node.type === "button"));
  for (const link of h.nodes().filter(node => node.type === "a")) { assert.equal(link.props.target, "_blank"); assert.equal(link.props.rel, "noopener noreferrer"); }
  h.render({ open: false }); h.render({ open: true }); assert.match(h.text(), /Ya tienes una reunión agendada/);
});

test("phone-only lead must provide a valid email without creating another lead", async () => {
  let email; const calls = [];
  const h = mount(component, { ...base, email: null, onEmail: value => { email = value; } }, async url => { calls.push(url); return response({ success: true, slots: [] }); });
  h.click("Agendar reunión"); assert.match(h.text(), /¿Cuál podemos usar/);
  const input = () => h.nodes().find(node => node.type === "input");
  const submit = () => h.nodes().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  input().props.onChange({ target: { value: "bad" } }); submit(); assert.match(h.text(), /correo electrónico válido/);
  input().props.onChange({ target: { value: "new@example.test" } }); submit();
  assert.equal(email, "new@example.test"); assert.ok(dates(h).length > 0); assert.equal(calls.length, 0);
});

test("409 reloads availability and removes the chosen slot", async () => {
  let queries = 0;
  const h = mount(component, base, async url => {
    if (url.includes("availability")) { queries++; return response({ success: true, slots: queries === 1 ? [slot(new URL(url, "http://local").searchParams.get("date"))] : [] }); }
    return response({ success: false }, 409);
  });
  h.click("Agendar reunión"); dates(h)[0].props.onClick(); await settle();
  h.click("15:30"); h.click("Confirmar reunión"); await settle(); await settle();
  assert.equal(queries, 2); assert.match(h.text(), /Ese horario acaba de dejar de estar disponible/);
  assert.match(h.text(), /No tenemos horarios disponibles ese día/);
});

test("stale availability cannot replace the latest selected date", async () => {
  let finishFirst; let count = 0;
  const h = mount(component, base, async url => {
    const date = new URL(url, "http://local").searchParams.get("date");
    if (++count === 1) return new Promise(resolve => { finishFirst = () => resolve(response({ success: true, slots: [slot(date, "09:00")] })); });
    return response({ success: true, slots: [slot(date, "10:00")] });
  });
  h.click("Agendar reunión"); dates(h)[0].props.onClick(); dates(h)[1].props.onClick(); await settle();
  finishFirst(); await settle(); assert.ok(h.button("10:00")); assert.doesNotMatch(h.text(), /09:00/);
});

test("availability and booking errors allow conversation and retry", async () => {
  const unavailable = mount(component, base, async () => response({}, 500));
  unavailable.click("Agendar reunión"); dates(unavailable)[0].props.onClick(); await settle();
  assert.match(unavailable.text(), /No pudimos consultar los horarios/); unavailable.click("Seguir conversando"); assert.ok(unavailable.button("Agendar reunión"));
  const h = mount(component, base, async url => url.includes("availability") ? response({ success: true, slots: [slot(new URL(url, "http://local").searchParams.get("date"))] }) : response({}, 500));
  h.click("Agendar reunión"); dates(h)[0].props.onClick(); await settle(); h.click("15:30"); h.click("Confirmar reunión"); await settle();
  assert.match(h.text(), /Tu solicitud sigue registrada/); assert.ok(h.button("Confirmar reunión"));
});

test("lead capture is unchanged and booking receives the saved lead ID", async () => {
  const calls = [];
  const h = mount("components/FulcrumChat.tsx", {}, async (url, options) => {
    calls.push(url);
    if (url === "/api/chat") return response({ reply: "Podemos ayudarte con tu proyecto.", leadData: { requirement: "Sistema dental", email: "person@example.test", contactConsent: true, readyToCreate: true } });
    return response({ success: true, lead: { id: 42 } });
  });
  function send(value) {
    h.nodes().find(node => node.type === "textarea").props.onChange({ target: { value } });
    h.nodes().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  }
  send("Necesito un sistema para mi clínica dental."); await settle();
  const booking = h.nodes().find(node => typeof node.type === "function" && node.type.name === "ChatBooking");
  assert.equal(booking.props.leadId, 42); assert.equal(booking.props.email, base.email);
  send("Gracias"); await settle(); assert.deepEqual(calls, ["/api/chat", "/api/leads", "/api/chat"]);
});

test("model confirmation and availability claims are replaced by UI guidance", () => {
  const { safeBookingReply } = mount(component, base, () => {}).load("lib/chat-booking.ts");
  for (const text of ["Tu reunión quedó confirmada.", "He reservado tu reunión.", "Los horarios disponibles son 09:00 y 10:00.", "Podemos reunirnos a las 3:30 p. m.", "https://meet.google.com/fake", "La invitación fue enviada.", "El botón «Agendar reunión» debería estar visible.", "Haz clic en agendar", "Deberías ver el botón", "Selecciona un horario", "Elige una fecha", "Debajo del chat", "Menú de opciones", "Google Meet confirmado"]) {
    for (const [created, id] of [[false, null], [true, null], [false, 42], [true, 42]]) {
      const reply = safeBookingReply(text, created, id);
      assert.notEqual(reply, text);
      assert.doesNotMatch(reply, /botón|haz clic|selector|menú|horarios disponibles|invitación enviada/i);
    }
  }
  assert.equal(safeBookingReply("Podemos crear un sistema para tu clínica dental.", false), "Podemos crear un sistema para tu clínica dental.");
});

test("missing or invalid saved lead ID never enables booking or confirms registration", async () => {
  for (const lead of [undefined, {}, { id: null }, { id: "42" }, { id: 0 }, { id: -2 }]) {
    const h = mount("components/FulcrumChat.tsx", {}, async url => url === "/api/chat"
      ? response({ reply: "El botón Agendar reunión debería estar visible", leadData: { requirement: "Software dental", email: base.email, contactConsent: true, readyToCreate: true } })
      : response({ success: true, lead }));
    h.nodes().find(node => node.type === "textarea").props.onChange({ target: { value: "Necesito software para mi clínica dental." } });
    h.nodes().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    await settle();
    assert.ok(!h.nodes().some(node => typeof node.type === "function" && node.type.name === "ChatBooking"));
    assert.doesNotMatch(h.text(), /ya registré|botón Agendar/);
    assert.match(h.text(), /No pude registrar tu solicitud/);
  }
});

test("transport lead retries after failure with Jorge, preserves phone, and never duplicates after success", async () => {
  const attempts = [], records = new Map();
  const h = mount("components/FulcrumChat.tsx", {}, async (url, options) => {
    const input = JSON.parse(options.body);
    if (url === '/api/chat') {
      const leadData = input.message === '965874879'
        ? { phone: '965874879', contactConsent: true }
        : input.message === 'Jorge' ? { name: 'Jorge', readyToCreate: false }
        : input.message.includes('solicitudes') ? { requirement: 'Solicitudes de carga y trazos de rutas', service: 'Software Personalizado', aiSummary: 'Gestión de carga pesada' }
        : { requirement: 'Sistema para transporte de carga pesada' };
      return response({ reply: 'Podemos ayudarte.', leadData });
    }
    attempts.push(input);
    if (attempts.length === 1) return response({ success: false }, 500);
    records.set(input.requestId, { ...input, id: 55 });
    return response({ success: true, lead: records.get(input.requestId) });
  });
  const send = async value => {
    h.nodes().find(node => node.type === 'textarea').props.onChange({ target: { value } });
    const submit = h.nodes().find(node => node.type === 'form').props.onSubmit;
    submit({ preventDefault() {} }); submit({ preventDefault() {} });
    await settle();
  };
  await send('Necesito un sistema para transporte de carga pesada');
  await send('Quiero gestionar solicitudes de carga y trazos de rutas');
  await send('965874879');
  assert.equal(attempts.length, 1); assert.equal(attempts[0].phone, '965874879'); assert.equal(attempts[0].name, null);
  assert.ok(!h.nodes().some(node => node.type?.name === 'ChatBooking'));
  await send('Jorge');
  assert.equal(attempts.length, 2); assert.equal(attempts[1].name, 'Jorge'); assert.equal(attempts[1].phone, '965874879');
  assert.equal(attempts[1].service, 'Software Personalizado'); assert.equal(attempts[1].aiSummary, 'Gestión de carga pesada');
  assert.equal(attempts[0].requestId, attempts[1].requestId); assert.equal(records.size, 1);
  assert.equal(h.nodes().find(node => node.type?.name === 'ChatBooking').props.leadId, 55);
  await send('Sí'); await send('Gracias'); assert.equal(attempts.length, 2);
  assert.equal((h.text().match(/No pude registrar tu solicitud/g) || []).length, 1);
});

test("repeated save failures warn only once and permit another attempt", async () => {
  let attempts = 0;
  const h = mount('components/FulcrumChat.tsx', {}, async url => url === '/api/chat'
    ? response({ reply: 'Continuemos.', leadData: { requirement: 'Carga pesada', phone: '965874879', contactConsent: true } })
    : (++attempts, response({ success: false }, 500)));
  for (const value of ['Transporte', 'Jorge', 'Mi empresa']) {
    h.nodes().find(node => node.type === 'textarea').props.onChange({ target: { value } });
    h.nodes().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); await settle();
  }
  assert.equal(attempts, 3); assert.equal((h.text().match(/No pude registrar tu solicitud/g) || []).length, 1);
});

test("follow-up promises are neutralized and consent withdrawal stops eligibility", () => {
  const h = mount(component, base, () => {});
  const { safeBookingReply } = h.load('lib/chat-booking.ts');
  for (const text of ['Un especialista te contactará', 'Nuestro equipo se comunicará contigo', 'Te estaremos llamando', 'Alguien se pondrá en contacto', '¿Deseas que alguien de nuestro equipo se comunique contigo?']) {
    assert.equal(safeBookingReply(text, true, 55), 'Tu solicitud puede ser revisada por el equipo de FULCRUM.');
    assert.doesNotMatch(safeBookingReply(text, false, null), /ya|registrada/);
  }
  const { mergeChatLead, normalizeChatLead } = h.load('lib/chat-lead.ts');
  const previous = mergeChatLead(normalizeChatLead(null), { requirement: 'Carga pesada', phone: ' 965874879 ', contactConsent: true });
  assert.equal(previous.phone, '965874879'); assert.equal(previous.readyToCreate, true);
  assert.equal(mergeChatLead(previous, { name: 'Jorge' }).readyToCreate, true);
  assert.equal(mergeChatLead(previous, { contactConsent: false }).readyToCreate, false);
});

test("restart removes the previous booking and allows a new lead; continuing preserves it", async () => {
  let saves = 0;
  const h = mount("components/FulcrumChat.tsx", {}, async url => url === "/api/chat"
    ? response({ reply: "Gracias por contarnos tu proyecto.", leadData: { requirement: "Software dental", email: base.email, contactConsent: true, readyToCreate: true } })
    : response({ success: true, lead: { id: ++saves } }));
  const send = async () => {
    h.nodes().find(node => node.type === "textarea").props.onChange({ target: { value: "Necesito software para mi clínica dental." } });
    h.nodes().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    await settle();
  };
  await send();
  assert.equal(h.nodes().find(node => node.type?.name === "ChatBooking").props.leadId, 1);
  h.click("Nueva conversación");
  assert.ok(!h.nodes().some(node => node.type?.name === "ChatBooking"));
  await send();
  assert.equal(h.nodes().find(node => node.type?.name === "ChatBooking").props.leadId, 2);
  const booking = mount(component, base, () => {});
  booking.click("Seguir conversando");
  assert.doesNotMatch(booking.text(), /¿Deseas agendar/);
  booking.click("Agendar reunión"); assert.ok(dates(booking).length);
});
