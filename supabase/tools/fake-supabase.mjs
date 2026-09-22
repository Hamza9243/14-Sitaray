// A tiny local stand-in for Supabase (PostgREST + GoTrue + Storage) backed by PGlite (real Postgres in WASM).
// It runs the REAL migration + seed, so Row Level Security policies, triggers and RPCs behave exactly as in
// production. It exists so the CMS can be developed and tested with no Docker and no cloud project:
//
//   node supabase/tools/fake-supabase.mjs            # listens on http://localhost:54321
//   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=<printed anon key> npm run dev
//
// NOT a production server: it supports only the subset of PostgREST that the app uses (filters, order,
// limit/offset, count, single, upsert, rpc — no embedded resources).
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');
const seedFile = path.resolve(here, '../seed.sql');

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
const JWT_SECRET = 'fake-supabase-jwt-secret-for-local-testing-only';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (payload) => {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};
const verify = (token) => {
  const [h, b, s] = token.split('.');
  if (!s) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  if (expected !== s) return null;
  const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return { expired: true };
  return payload;
};
export const ANON_KEY = sign({ role: 'anon', iss: 'fake-supabase' });

let db;
let users; // email -> { id, password }
let refreshTokens;
let objects; // "bucket/path" -> { bytes, contentType }
let lastRecovery;
let columnTypes;

async function boot() {
  db = new PGlite();
  users = new Map();
  refreshTokens = new Map();
  objects = new Map();
  lastRecovery = null;
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant select on storage.buckets to anon, authenticated;
  `);
  for (const f of fs.readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, f), 'utf8'));
  }
  if (fs.existsSync(seedFile) && process.env.FAKE_SUPABASE_NO_SEED !== '1') await db.exec(fs.readFileSync(seedFile, 'utf8'));
  const cols = await db.query(
    `select table_name, column_name, data_type, udt_name from information_schema.columns where table_schema = 'public'`
  );
  columnTypes = new Map(cols.rows.map((c) => [`${c.table_name}.${c.column_name}`, c]));
}

// ---------------------------------------------------------------- SQL building
const ident = (s) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) throw httpError(400, 'PGRST100', `bad identifier: ${s}`);
  return `"${s}"`;
};
const lit = (v) => `'${String(v).replace(/'/g, "''")}'`;

function httpError(status, code, message, details = null) {
  const e = new Error(message);
  e.status = status;
  e.body = { code, message, details, hint: null };
  return e;
}

function splitTop(str, sep = ',') {
  const parts = [];
  let depth = 0;
  let quote = false;
  let cur = '';
  for (const ch of str) {
    if (ch === '"') quote = !quote;
    if (!quote) {
      if (ch === '(' || ch === '{') depth += 1;
      if (ch === ')' || ch === '}') depth -= 1;
      if (ch === sep && depth === 0) {
        parts.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur !== '') parts.push(cur);
  return parts;
}

function unquote(v) {
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v;
}

function condition(column, opAndValue) {
  let negate = false;
  let rest = opAndValue;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const dot = rest.indexOf('.');
  const op = rest.slice(0, dot);
  const raw = rest.slice(dot + 1);
  const col = ident(column);
  let sql;
  switch (op) {
    case 'eq': sql = `${col} = ${lit(raw)}`; break;
    case 'neq': sql = `${col} <> ${lit(raw)}`; break;
    case 'gt': sql = `${col} > ${lit(raw)}`; break;
    case 'gte': sql = `${col} >= ${lit(raw)}`; break;
    case 'lt': sql = `${col} < ${lit(raw)}`; break;
    case 'lte': sql = `${col} <= ${lit(raw)}`; break;
    case 'like': sql = `${col} like ${lit(raw.replace(/\*/g, '%'))}`; break;
    case 'ilike': sql = `${col} ilike ${lit(raw.replace(/\*/g, '%'))}`; break;
    case 'is': sql = raw === 'null' ? `${col} is null` : `${col} is ${raw === 'true' ? 'true' : 'false'}`; break;
    case 'in': sql = `${col} in (${splitTop(raw.slice(1, -1)).map((v) => lit(unquote(v))).join(', ')})`; break;
    case 'cs': sql = `${col} @> ${lit(raw)}`; break;
    case 'cd': sql = `${col} <@ ${lit(raw)}`; break;
    default: throw httpError(400, 'PGRST100', `unsupported operator: ${op}`);
  }
  return negate ? `not (${sql})` : sql;
}

function orExpr(inner, joiner = 'or') {
  return `(${splitTop(inner)
    .map((part) => {
      const m = /^(and|or)\((.*)\)$/.exec(part);
      if (m) return orExpr(m[2], m[1]);
      const i = part.indexOf('.');
      return condition(part.slice(0, i), part.slice(i + 1));
    })
    .join(` ${joiner} `)})`;
}

function parseQuery(url) {
  const where = [];
  let select = '*';
  let order = '';
  let limit = null;
  let offset = null;
  let onConflict = null;
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'select') select = value;
    else if (key === 'order') {
      order = splitTop(value)
        .map((o) => {
          const [c, ...mods] = o.split('.');
          return `${ident(c)} ${mods.includes('desc') ? 'desc' : 'asc'}${mods.includes('nullsfirst') ? ' nulls first' : mods.includes('nullslast') ? ' nulls last' : ''}`;
        })
        .join(', ');
    } else if (key === 'limit') limit = Number(value);
    else if (key === 'offset') offset = Number(value);
    else if (key === 'on_conflict') onConflict = value;
    else if (key === 'or') where.push(orExpr(value.slice(1, -1), 'or'));
    else if (key === 'and') where.push(orExpr(value.slice(1, -1), 'and'));
    else if (key === 'columns') { /* ignored */ }
    else where.push(condition(key, value));
  }
  if (select.includes('(')) throw httpError(400, 'PGRST100', 'fake-supabase: embedded resources are not supported');
  const selectSql = select === '*' ? '*' : splitTop(select).map((c) => ident(c.trim())).join(', ');
  return { where: where.length ? ` where ${where.join(' and ')}` : '', select: selectSql, order: order ? ` order by ${order}` : '', limit, offset, onConflict };
}

function valueSql(table, column, v) {
  if (v === null || v === undefined) return 'null';
  const meta = columnTypes.get(`${table}.${column}`);
  if (meta?.data_type === 'ARRAY') {
    const arr = Array.isArray(v) ? v : [v];
    return lit(`{${arr.map((x) => `"${String(x).replace(/(["\\])/g, '\\$1')}"`).join(',')}}`);
  }
  if (meta?.data_type === 'jsonb' || meta?.data_type === 'json') return `${lit(JSON.stringify(v))}::jsonb`;
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return lit(v);
}

// ---------------------------------------------------------------- execution
async function runAs(auth, fn) {
  const role = auth?.sub ? 'authenticated' : 'anon';
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [auth?.sub ?? '']);
    return fn(tx);
  });
}

function pgToHttp(err) {
  const code = err.code ?? '';
  const message = err.message ?? String(err);
  if (code === '42501' || /row-level security|permission denied|not authorized|only a super admin/i.test(message)) {
    return httpError(403, '42501', message);
  }
  if (code === '23505') return httpError(409, code, message);
  if (code === '23503') return httpError(409, code, message);
  if (code === 'P0001' || code === '22023') return httpError(400, code, message);
  return httpError(400, code || 'PGRST000', message);
}

async function restHandler(req, url, body, auth, res) {
  const table = decodeURIComponent(url.pathname.replace(/^\/rest\/v1\//, ''));
  const method = req.method;
  const prefer = req.headers.prefer ?? '';
  const wantsRows = prefer.includes('return=representation');
  const wantsCount = prefer.includes('count=exact');
  const single = (req.headers.accept ?? '').includes('vnd.pgrst.object+json');

  // RPC -------------------------------------------------------------------
  if (table.startsWith('rpc/')) {
    const fn = table.slice(4);
    const args = body && typeof body === 'object' ? Object.entries(body) : [];
    const named = args.map(([k, v]) => `${ident(k)} := ${typeof v === 'object' && v !== null ? `${lit(JSON.stringify(v))}::jsonb` : v === null ? 'null' : lit(v)}`).join(', ');
    const meta = (await db.query(`select proretset, prorettype::regtype::text as ret from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1 limit 1`, [fn])).rows[0];
    if (!meta) throw httpError(404, 'PGRST202', `Could not find the function public.${fn}`);
    const sql = meta.proretset
      ? `select coalesce(json_agg(t), '[]'::json) as r from ${ident(fn)}(${named}) t`
      : meta.ret === 'void'
        ? `select ${ident(fn)}(${named}); select null::json as r`
        : `select to_json(${ident(fn)}(${named})) as r`;
    const out = await runAs(auth, async (tx) => {
      if (meta.ret === 'void' && !meta.proretset) {
        await tx.query(`select ${ident(fn)}(${named})`);
        return null;
      }
      return (await tx.query(sql)).rows[0].r;
    }).catch((e) => { throw pgToHttp(e); });
    return send(res, 200, out);
  }

  const q = parseQuery(url);
  const t = ident(table);

  if (method === 'GET' || method === 'HEAD') {
    const result = await runAs(auth, async (tx) => {
      const count = wantsCount ? (await tx.query(`select count(*)::int as n from public.${t}${q.where}`)).rows[0].n : null;
      const page = `${q.limit != null ? ` limit ${q.limit}` : ''}${q.offset != null ? ` offset ${q.offset}` : ''}`;
      const rows = (await tx.query(`select coalesce(json_agg(x), '[]'::json) as r from (select ${q.select} from public.${t}${q.where}${q.order}${page}) x`)).rows[0].r;
      return { rows, count };
    }).catch((e) => { throw pgToHttp(e); });
    return sendRows(res, result.rows, { single, count: result.count, offset: q.offset ?? 0, status: 200 });
  }

  if (method === 'POST') {
    const list = Array.isArray(body) ? body : [body];
    const keys = [...new Set(list.flatMap((r) => Object.keys(r)))];
    const cols = keys.map(ident).join(', ');
    const values = list.map((r) => `(${keys.map((k) => valueSql(table, k, r[k])).join(', ')})`).join(', ');
    let conflict = '';
    if (q.onConflict) {
      const target = q.onConflict.split(',').map(ident).join(', ');
      const merge = prefer.includes('resolution=merge-duplicates');
      const sets = keys.filter((k) => !q.onConflict.split(',').includes(k)).map((k) => `${ident(k)} = excluded.${ident(k)}`);
      conflict = merge && sets.length ? ` on conflict (${target}) do update set ${sets.join(', ')}` : ` on conflict (${target}) do nothing`;
    }
    const rows = await runAs(auth, async (tx) => {
      const sql = `insert into public.${t} (${cols}) values ${values}${conflict}${wantsRows ? ' returning *' : ''}`;
      if (!wantsRows) { await tx.query(sql); return []; }
      return (await tx.query(`with dml as (${sql}) select coalesce(json_agg(dml), '[]'::json) as r from dml`)).rows[0].r;
    }).catch((e) => { throw pgToHttp(e); });
    return wantsRows ? sendRows(res, rows, { single, status: 201 }) : send(res, 201, null);
  }

  if (method === 'PATCH') {
    const sets = Object.entries(body).map(([k, v]) => `${ident(k)} = ${valueSql(table, k, v)}`).join(', ');
    const rows = await runAs(auth, async (tx) => {
      const sql = `update public.${t} set ${sets}${q.where}${wantsRows ? ' returning *' : ''}`;
      if (!wantsRows) { await tx.query(sql); return []; }
      return (await tx.query(`with dml as (${sql}) select coalesce(json_agg(dml), '[]'::json) as r from dml`)).rows[0].r;
    }).catch((e) => { throw pgToHttp(e); });
    return wantsRows ? sendRows(res, rows, { single, status: 200 }) : send(res, 204, null);
  }

  if (method === 'DELETE') {
    const rows = await runAs(auth, async (tx) => {
      const sql = `delete from public.${t}${q.where}${wantsRows ? ' returning *' : ''}`;
      if (!wantsRows) { await tx.query(sql); return []; }
      return (await tx.query(`with dml as (${sql}) select coalesce(json_agg(dml), '[]'::json) as r from dml`)).rows[0].r;
    }).catch((e) => { throw pgToHttp(e); });
    return wantsRows ? sendRows(res, rows, { single, status: 200 }) : send(res, 204, null);
  }

  throw httpError(405, 'PGRST000', 'method not allowed');
}

// ---------------------------------------------------------------- auth
function userPayload(email, id) {
  return { id, aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() };
}
function issueSession(email, id) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(process.env.FAKE_SUPABASE_TOKEN_TTL ?? 3600);
  const access_token = sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + ttl });
  const refresh_token = crypto.randomUUID();
  refreshTokens.set(refresh_token, { email, id });
  return { access_token, token_type: 'bearer', expires_in: ttl, expires_at: now + ttl, refresh_token, user: userPayload(email, id) };
}

async function authHandler(req, url, body, auth, res) {
  const p = url.pathname.replace(/^\/auth\/v1/, '');
  if (p === '/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const u = users.get(String(body.email).toLowerCase());
      if (!u || u.password !== body.password) throw httpError(400, 'invalid_credentials', 'Invalid login credentials');
      await db.query(`update auth.users set last_sign_in_at = now() where id = $1`, [u.id]);
      return send(res, 200, issueSession(String(body.email).toLowerCase(), u.id));
    }
    if (grant === 'refresh_token') {
      const t = refreshTokens.get(body.refresh_token);
      if (!t) throw httpError(400, 'invalid_grant', 'Invalid Refresh Token: Refresh Token Not Found');
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, issueSession(t.email, t.id));
    }
  }
  if (p === '/user' && req.method === 'GET') {
    if (!auth?.sub) throw httpError(401, 'bad_jwt', 'invalid JWT');
    return send(res, 200, userPayload(auth.email, auth.sub));
  }
  if (p === '/user' && req.method === 'PUT') {
    if (!auth?.sub) throw httpError(401, 'bad_jwt', 'invalid JWT');
    const u = [...users.entries()].find(([, v]) => v.id === auth.sub);
    if (body.password && u) u[1].password = body.password;
    return send(res, 200, userPayload(auth.email, auth.sub));
  }
  if (p === '/logout') return send(res, 204, null);
  if (p === '/recover') { lastRecovery = { email: body.email, at: Date.now() }; return send(res, 200, {}); }
  throw httpError(404, 'not_found', `fake-supabase: unsupported auth route ${p}`);
}

// ---------------------------------------------------------------- storage
async function storageHandler(req, url, rawBody, auth, res) {
  const p = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\/object\//, ''));

  if (req.method === 'GET' && p.startsWith('public/')) {
    const key = p.slice('public/'.length);
    const obj = objects.get(key);
    if (!obj) return send(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' });
    res.writeHead(200, { 'content-type': obj.contentType, 'content-length': obj.bytes.length, 'accept-ranges': 'bytes', ...cors() });
    return res.end(obj.bytes);
  }

  if (req.method === 'DELETE') {
    const { prefixes } = JSON.parse(rawBody.toString() || '{}');
    const removed = [];
    for (const key of prefixes ?? []) {
      const slash = key.indexOf('/');
      const bucket = p.split('/')[0];
      const name = key.startsWith(`${bucket}/`) ? key.slice(bucket.length + 1) : key;
      const done = await runAs(auth, (tx) => tx.query(`delete from storage.objects where bucket_id = $1 and name = $2 returning name`, [bucket, name])).catch((e) => { throw pgToHttp(e); });
      if (done.rows.length) { objects.delete(`${bucket}/${name}`); removed.push({ name }); }
      void slash;
    }
    return send(res, 200, removed);
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const [bucket, ...rest] = p.split('/');
    const name = rest.join('/');
    const contentType = (req.headers['content-type'] ?? 'application/octet-stream').split(';')[0];
    const b = (await db.query(`select file_size_limit, allowed_mime_types from storage.buckets where id = $1`, [bucket])).rows[0];
    if (!b) throw httpError(404, 'not_found', 'Bucket not found');
    // Multipart uploads from supabase-js carry the file in a form part; unwrap it.
    let bytes = rawBody;
    let type = contentType;
    if (contentType === 'multipart/form-data') {
      const boundary = /boundary=(.+)$/.exec(req.headers['content-type'])[1];
      const buf = rawBody;
      const delim = Buffer.from(`--${boundary}`);
      const starts = [];
      for (let pos = 0; ; ) {
        const i = buf.indexOf(delim, pos);
        if (i === -1) break;
        starts.push(i + delim.length);
        pos = i + delim.length;
      }
      // the file is the part that declares a Content-Type / filename; plain fields (cacheControl) do not
      for (let k = 0; k < starts.length - 1; k += 1) {
        const partStart = starts[k] + 2;
        const partEnd = starts[k + 1] - delim.length - 2;
        const headEnd = buf.indexOf('\r\n\r\n', partStart);
        const head = buf.subarray(partStart, headEnd).toString('latin1');
        if (/filename=|content-type:/i.test(head)) {
          type = /content-type:\s*([^\r\n]+)/i.exec(head)?.[1] ?? 'application/octet-stream';
          bytes = buf.subarray(headEnd + 4, partEnd);
        }
      }
    }
    if (b.allowed_mime_types && !b.allowed_mime_types.includes(type)) throw httpError(415, 'InvalidMimeType', `mime type ${type} is not supported`);
    if (b.file_size_limit && bytes.length > Number(b.file_size_limit)) throw httpError(413, 'Payload too large', 'The object exceeded the maximum allowed size');
    const upsert = req.headers['x-upsert'] === 'true' || req.method === 'PUT';
    const exists = objects.has(`${bucket}/${name}`);
    if (exists && !upsert) throw httpError(409, 'Duplicate', 'The resource already exists');
    await runAs(auth, async (tx) => {
      if (exists) {
        const r = await tx.query(`update storage.objects set name = name where bucket_id = $1 and name = $2 returning id`, [bucket, name]);
        if (!r.rows.length) throw Object.assign(new Error('new row violates row-level security policy'), { code: '42501' });
      } else {
        await tx.query(`insert into storage.objects (bucket_id, name, owner) values ($1, $2, auth.uid())`, [bucket, name]);
      }
    }).catch((e) => { throw pgToHttp(e); });
    objects.set(`${bucket}/${name}`, { bytes, contentType: type });
    return send(res, 200, { Id: crypto.randomUUID(), Key: `${bucket}/${name}` });
  }
  throw httpError(404, 'not_found', `fake-supabase: unsupported storage route ${p}`);
}

// ---------------------------------------------------------------- test helpers
async function testHandler(req, url, body, res) {
  const p = url.pathname;
  if (p === '/__test/reset') { await boot(); return send(res, 200, { ok: true }); }
  if (p === '/__test/config') return send(res, 200, { anonKey: ANON_KEY, lastRecovery });
  if (p === '/__test/create-user') {
    const email = String(body.email).toLowerCase();
    const id = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
    users.set(email, { id, password: body.password });
    if (body.role) await db.query(`insert into admin_users (auth_user_id, email, role) values ($1, $2, $3)`, [id, email, body.role]);
    return send(res, 200, { id, email });
  }
  if (p === '/__test/sql') {
    const r = await db.query(body.sql, body.params ?? []);
    return send(res, 200, r.rows);
  }
  if (p === '/__test/objects') return send(res, 200, [...objects.keys()]);
  throw httpError(404, 'not_found', 'unknown test route');
}

// ---------------------------------------------------------------- http plumbing
const cors = () => ({
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
  'access-control-expose-headers': 'Content-Range,Content-Length',
});

function send(res, status, json, extra = {}) {
  const payload = json === null || json === undefined ? '' : JSON.stringify(json);
  res.writeHead(status, { 'content-type': 'application/json', ...cors(), ...extra });
  res.end(status === 204 ? undefined : payload);
}

function sendRows(res, rows, { single, count, offset = 0, status }) {
  if (single) {
    if (rows.length !== 1) {
      return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${rows.length} rows`, hint: null });
    }
    return send(res, status, rows[0]);
  }
  const extra = count != null ? { 'content-range': rows.length ? `${offset}-${offset + rows.length - 1}/${count}` : `*/${count}` } : {};
  return send(res, status, rows, extra);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function authFrom(req) {
  const header = req.headers.authorization ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token || token === ANON_KEY) return null;
  const payload = verify(token);
  if (!payload) throw httpError(401, 'PGRST301', 'JWSError JWSInvalidSignature');
  if (payload.expired) throw httpError(401, 'PGRST303', 'JWT expired');
  return payload.sub ? payload : null;
}

export async function start() {
  await boot();
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end(); }
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const raw = await readBody(req);
      const isJson = !(req.headers['content-type'] ?? '').startsWith('multipart') && !url.pathname.startsWith('/storage/');
      const body = isJson && raw.length ? JSON.parse(raw.toString()) : null;

      if (url.pathname.startsWith('/__test/')) return await testHandler(req, url, body, res);
      const auth = authFrom(req);
      if (url.pathname.startsWith('/rest/v1/')) return await restHandler(req, url, body, auth, res);
      if (url.pathname.startsWith('/auth/v1/')) return await authHandler(req, url, body ?? {}, auth, res);
      if (url.pathname.startsWith('/storage/v1/object/')) return await storageHandler(req, url, raw, auth, res);
      send(res, 404, { message: 'not found' });
    } catch (e) {
      if (e.status) return send(res, e.status, e.body);
      console.error('[fake-supabase] unexpected', e);
      send(res, 500, { code: 'PGRST000', message: String(e?.message ?? e) });
    }
  });
  await new Promise((resolve) => server.listen(PORT, resolve));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await start();
  console.log(`fake-supabase listening on http://localhost:${PORT}`);
  console.log(`anon key: ${ANON_KEY}`);
  console.log('create a test admin: POST /__test/create-user {"email","password","role":"super_admin"}');
}
