const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { NextRequest } = require("next/server");

// Exercise the actual TypeScript routes with isolated external services.
// No .env files are read, no emails sent and no calendar/database writes performed.
const now = Date.parse("2026-10-11T12:00:00-05:00");
const valid = { email: "booking@example.test", name: "Test Client", start: "2026-10-15T15:00:00-05:00" };

function harness(options = {}) {
  const calls = { inserts: [], deletes: [], busy: [], gets: 0, updates: 0 };
  const rows = [];
  const cache = new Map();
  let locked = false;
  const env = { NODE_ENV: "development", GOOGLE_CLIENT_ID: "fake-id", GOOGLE_CLIENT_SECRET: "secret-sentinel", GOOGLE_REDIRECT_URI: "http://localhost:3000/api/google/callback", GOOGLE_REFRESH_TOKEN: "refresh-sentinel", ...options.env };
  class Clock extends Date { static now() { return now; } }
  const readyConference = { entryPoints: [{ entryPointType: "phone", uri: "tel:123" }, { entryPointType: "video", uri: "https://meet.google.com/test" }] };
  const calendar = {
    freebusy: { query: async (args) => {
      calls.busy.push(args);
      if (options.googleError) throw new Error("secret-sentinel refresh-sentinel");
      return { data: options.freebusyResponse ?? { calendars: { primary: { busy: options.busy ?? [] } } } };
    } },
    events: {
      insert: async (args) => {
        calls.inserts.push(args);
        await new Promise(resolve => setImmediate(resolve));
        if (options.insertError) throw new Error("secret-sentinel");
        return { data: { id: args.requestBody.id, htmlLink: "https://calendar.google.com/test", conferenceData: options.pending ? { createRequest: { status: { statusCode: "pending" } } } : readyConference } };
      },
      get: async ({ eventId }) => {
        calls.gets++;
        if (options.pollError) throw new Error("refresh-sentinel");
        return { data: { id: eventId, conferenceData: options.stillPending ? { createRequest: { status: { statusCode: "pending" } } } : readyConference } };
      },
      delete: async (args) => { calls.deletes.push(args); if (options.deleteError) throw new Error("refresh-sentinel"); },
    },
  };
  const google = {
    auth: { OAuth2: class {
      constructor(id, secret, redirect) { assert.equal(id, env.GOOGLE_CLIENT_ID); assert.equal(secret, env.GOOGLE_CLIENT_SECRET); assert.equal(redirect, env.GOOGLE_REDIRECT_URI); }
      setCredentials(value) { assert.equal(value.refresh_token, env.GOOGLE_REFRESH_TOKEN); }
    } },
    calendar: (args) => { assert.equal(args.version, "v3"); return calendar; },
  };
  function select(row, fields) { return row && Object.fromEntries(Object.keys(fields).map(key => [key, row[key] ?? null])); }
  const meeting = {
    findMany: async () => options.localBusy ?? rows,
    findFirst: async () => options.existing ? { id: 8 } : rows[0] ?? null,
    findUnique: async ({ where, select: fields }) => select(rows.find(row => row.googleEventId === where.googleEventId), fields),
    update: async ({ where, data, select: fields }) => { calls.updates++; const row = rows.find(row => row.id === where.id); Object.assign(row, data); return select(row, fields); },
  };
  const prisma = {
    meeting,
    $transaction: async (fn) => {
      let ownsLock = false;
      let pendingRow;
      try {
        const result = await fn({
          $queryRaw: async () => {
            if (locked || options.locked) return [{ acquired: false }];
            locked = ownsLock = true; return [{ acquired: true }];
          },
          lead: { findUnique: async () => options.lead ?? null },
          meeting: { ...meeting, create: async ({ data, select: fields }) => {
            if (options.dbError) throw new Error("database-secret-sentinel");
            pendingRow = { id: rows.length + 1, ...data };
            return select(pendingRow, fields);
          } },
        });
        if (pendingRow) rows.push(pendingRow);
        return result;
      } finally { if (ownsLock) locked = false; }
    },
  };
  function load(relative) {
    const filename = path.resolve(__dirname, "..", relative);
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText;
    const context = { exports: {}, process: { env }, Date: Clock, require: name => {
      if (name === "server-only") return {};
      if (name === "googleapis") return { google };
      if (name === "node:timers/promises") return { setTimeout: async () => {} };
      if (name === "@/lib/prisma") return { prisma };
      if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
      return require(name);
    } };
    vm.runInNewContext(output, context, { filename });
    cache.set(filename, context.exports);
    return context.exports;
  }
  return {
    calls, rows, load,
    book: (body = valid) => load("app/api/calendar/book/route.ts").POST(new Request("http://localhost/api/calendar/book", { method: "POST", body: JSON.stringify(body) })),
    availability: (date) => load("app/api/calendar/availability/route.ts").GET(new NextRequest(`http://localhost/api/calendar/availability?date=${date}`)),
  };
}

test("Lima dates, weekdays, notice period, grid and boundaries", () => {
  const s = harness().load("lib/calendar-scheduling.ts");
  assert.equal(s.isValidDate("2026-02-30"), false);
  assert.equal(s.isValidDate("2028-02-29"), true);
  assert.equal(s.businessSlots("2026-10-17").length, 0);
  assert.equal(s.businessSlots("2026-10-15").length, 18);
  assert.equal(s.businessSlots("2026-10-15")[17].end, "2026-10-15T18:00:00-05:00");
  assert.equal(s.businessSlots("2026-10-15", Date.parse("2026-10-15T08:30:00-05:00"))[0].label, "09:00");
  assert.equal(s.businessSlots("2026-10-15", Date.parse("2026-10-15T08:30:01-05:00"))[0].label, "09:30");
  assert.equal(s.businessSlots("2026-10-09").length, 0);
  assert.equal(s.overlaps(10, 20, [{ start: 20, end: 30 }]), false);
  assert.equal(s.overlaps(10, 20, [{ start: 19, end: 30 }]), true);
});

test("availability filters partial overlaps and database reservations", async () => {
  const h = harness({ busy: [{ start: "2026-10-15T09:15:00-05:00", end: "2026-10-15T10:00:00-05:00" }], localBusy: [{ startAt: new Date("2026-10-15T11:00:00-05:00"), endAt: new Date("2026-10-15T11:30:00-05:00") }] });
  const response = await h.availability("2026-10-15");
  const data = await response.json();
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(data.timezone, "America/Lima"); assert.equal(data.slots.length, 15);
  assert.equal(data.slots[0].label, "10:00"); assert.ok(!data.slots.some(slot => slot.label === "11:00"));
  assert.equal(h.calls.busy[0].requestBody.items[0].id, "primary");
});

test("weekends, past dates, invalid dates and duplicate date parameters", async () => {
  const h = harness();
  for (const date of ["2026-10-17", "2026-10-18", "2026-10-09"]) assert.equal((await (await h.availability(date)).json()).slots.length, 0);
  for (const date of ["2026-02-30", "bad", "2026-1-1", "2026-10-15&date=2026-10-16"]) assert.equal((await h.availability(date)).status, 400);
  assert.equal(h.calls.busy.length, 0);
});

test("invalid booking inputs never reach Calendar", async () => {
  const h = harness();
  for (const body of [null, [], {}, { ...valid, email: "wrong" }, { ...valid, email: "x\n@example.test" }, { ...valid, leadId: "2" }, { ...valid, leadId: -1 }, { ...valid, name: 7 }, { ...valid, end: "arbitrary" }, ...["2026-10-15T18:00:00-05:00", "2026-10-15T08:30:00-05:00", "2026-10-15T15:15:00-05:00", "2026-10-17T15:00:00-05:00", "2026-10-15T15:00:00", "2026-02-30T15:00:00-05:00"].map(start => ({ ...valid, start }))]) {
    assert.equal((await h.book(body)).status, 400);
  }
  assert.equal(h.calls.inserts.length, 0); assert.equal(h.calls.busy.length, 0);
});

test("missing lead is rejected before creating an event", async () => {
  const h = harness(); assert.equal((await h.book({ ...valid, leadId: 2 })).status, 404); assert.equal(h.calls.inserts.length, 0);
});

test("booking rechecks exact range, invites attendee, saves Meet and lead summary", async () => {
  const h = harness({ lead: { id: 2, service: "Design", requirement: "A project", aiSummary: "A brief summary", phone: "must-not-be-shared" }, pending: true });
  const response = await h.book({ ...valid, leadId: 2 });
  const data = await response.json();
  assert.equal(response.status, 201); assert.equal(data.meeting.meetUrl, "https://meet.google.com/test");
  const insert = h.calls.inserts[0];
  assert.equal(insert.sendUpdates, "all"); assert.equal(insert.conferenceDataVersion, 1);
  assert.equal(insert.requestBody.attendees[0].email, valid.email);
  assert.equal(insert.requestBody.start.timeZone, "America/Lima");
  assert.equal(Date.parse(insert.requestBody.end.dateTime) - Date.parse(valid.start), 1800000);
  assert.equal(h.calls.busy[0].requestBody.timeMin, valid.start);
  assert.equal(h.calls.busy[0].requestBody.timeMax, insert.requestBody.end.dateTime);
  assert.match(insert.requestBody.description, /Design/); assert.doesNotMatch(insert.requestBody.description, /must-not-be-shared/);
  assert.equal(h.rows[0].status, "SCHEDULED"); assert.equal(h.rows[0].leadId, 2);
  assert.equal(h.calls.updates, 1);
});

test("occupied slots and simultaneous bookings yield 409 without duplicates", async () => {
  for (const options of [{ existing: true }, { locked: true }, { busy: [{ start: valid.start, end: "2026-10-15T15:30:00-05:00" }] }]) {
    const h = harness(options); const response = await h.book();
    assert.equal(response.status, 409); assert.equal((await response.json()).error, "Ese horario ya no está disponible"); assert.equal(h.calls.inserts.length, 0);
  }
  const h = harness();
  const responses = await Promise.all([h.book(), h.book()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal(h.calls.inserts.length, 1); assert.equal(h.rows.length, 1);
});

test("FreeBusy embedded errors fail closed and do not leak internals", async () => {
  for (const response of [{}, { calendars: { primary: { errors: [{ reason: "internalError" }], busy: [] } } }, { calendars: { primary: { busy: [{ start: "bad", end: "bad" }] } } }]) {
    const h = harness({ freebusyResponse: response });
    assert.equal((await h.book()).status, 500); assert.equal((await h.availability("2026-10-15")).status, 500); assert.equal(h.calls.inserts.length, 0);
  }
  const response = await harness({ googleError: true }).book();
  assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /sentinel/);
});

test("failed persistence compensates only this request's event", async () => {
  const h = harness({ dbError: true }); const response = await h.book();
  assert.equal(response.status, 500); assert.equal(h.rows.length, 0);
  assert.equal(h.calls.deletes[0].eventId, h.calls.inserts[0].requestBody.id);
  assert.equal(h.calls.deletes[0].sendUpdates, "all");
  assert.doesNotMatch(await response.text(), /sentinel/);
  const uncertain = harness({ dbError: true, deleteError: true });
  assert.match((await (await uncertain.book()).json()).error, /conciliación/);
});

test("Meet pending or read failure preserves the confirmed booking", async () => {
  for (const options of [{ pending: true, stillPending: true }, { pending: true, pollError: true }]) {
    const h = harness(options); const response = await h.book(); const body = await response.json();
    assert.equal(response.status, 201); assert.equal(body.meeting.meetUrl, null); assert.ok(body.warning);
    assert.equal(h.rows.length, 1); assert.equal(h.calls.inserts.length, 1); assert.equal(h.calls.deletes.length, 0);
  }
});

test("development guard and missing credentials cause no writes", async () => {
  const production = harness({ env: { NODE_ENV: "production" } });
  assert.equal((await production.book()).status, 404); assert.equal((await production.availability("2026-10-15")).status, 404);
  const missing = harness({ env: { GOOGLE_REFRESH_TOKEN: "" } });
  assert.equal((await missing.book()).status, 500); assert.equal(missing.calls.inserts.length, 0);
});
