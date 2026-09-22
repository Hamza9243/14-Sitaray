import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const sqlFiles = [];
const db = new PGlite();

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

const migration = fs.readFileSync(path.join(here, '../migrations/20260101000000_cms_schema.sql'), 'utf8');
await db.exec(migration);
console.log('migration applied');
for (const f of sqlFiles) {
  await db.exec(fs.readFileSync(f, 'utf8'));
  console.log('applied', f);
}

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!cond) failures += 1;
};

async function as(role, uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`);
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec('reset role');
  }
}

const superId = '00000000-0000-0000-0000-000000000001';
const contentId = '00000000-0000-0000-0000-000000000002';
const parentId = '00000000-0000-0000-0000-000000000003';
const parent2Id = '00000000-0000-0000-0000-000000000004';
await db.exec(`
  insert into auth.users (id, email) values
   ('${superId}', 'super@x.com'), ('${contentId}', 'content@x.com'), ('${parentId}', 'parent@x.com'), ('${parent2Id}', 'parent2@x.com');
  insert into admin_users (auth_user_id, email, role) values ('${superId}', 'super@x.com', 'super_admin'), ('${contentId}', 'content@x.com', 'content_admin');
  insert into languages (code, name, native_name, direction, is_default, sort_order) values ('en','English','English','ltr',true,0), ('ur','Urdu','اردو','rtl',false,1), ('fa','Farsi','فارسی','rtl',false,2);
`);

// --- admin creates content
let r = await as('authenticated', contentId, `insert into stories (slug, title, body, status) values ('s-draft','Draft story','x','draft') returning id`);
check('content_admin can insert story', !r.error && r.rows.length === 1, r.error);
const draftId = r.rows?.[0]?.id;
r = await as('authenticated', contentId, `insert into stories (slug, title, body, status) values ('s-pub','Published story','x','published') returning id, published_at`);
const pubId = r.rows?.[0]?.id;
check('published_at stamped on publish', !!r.rows?.[0]?.published_at);

// --- anon sees only published
r = await as('anon', null, `select id from stories`);
check('anon reads only published stories', r.rows?.length === 1 && r.rows[0].id === pubId, JSON.stringify(r));
r = await as('authenticated', parentId, `select id from stories`);
check('normal signed-in user reads only published stories', r.rows?.length === 1);
r = await as('authenticated', contentId, `select id from stories`);
check('admin reads drafts too', r.rows?.length === 2);

// --- non-admin writes denied
r = await as('anon', null, `insert into stories (slug, title) values ('hack','hack')`);
check('anon cannot insert', !!r.error, r.error);
r = await as('authenticated', parentId, `insert into stories (slug, title) values ('hack','hack')`);
check('parent cannot insert', !!r.error, r.error);
r = await as('authenticated', parentId, `update stories set title='pwn' where id = '${pubId}' returning id`);
check('parent cannot update (0 rows)', !r.error && r.rows.length === 0, r.error);
r = await as('authenticated', parentId, `delete from stories where id = '${pubId}' returning id`);
check('parent cannot delete (0 rows)', !r.error && r.rows.length === 0);

// --- soft delete vs hard delete
r = await as('authenticated', contentId, `update stories set deleted_at = now() where id = '${draftId}' returning id`);
check('content_admin can soft-delete', r.rows?.length === 1);
r = await as('authenticated', contentId, `delete from stories where id = '${draftId}' returning id`);
check('content_admin cannot HARD delete', !r.error && r.rows.length === 0);
r = await as('authenticated', superId, `delete from stories where id = '${draftId}' returning id`);
check('super_admin can hard delete', r.rows?.length === 1);

// --- unpublish hides from public
r = await as('authenticated', contentId, `update stories set status='unpublished' where id = '${pubId}' returning id`);
r = await as('anon', null, `select id from stories`);
check('unpublished story hidden from anon', r.rows?.length === 0);
await as('authenticated', contentId, `update stories set status='published' where id = '${pubId}'`);

// --- translations follow parent visibility
await as('authenticated', contentId, `insert into content_translations (content_type, content_id, language_code, fields) values ('story','${pubId}','ur','{"title":"اردو"}')`);
r = await as('anon', null, `select language_code from content_translations`);
check('anon reads translation of published story', r.rows?.length === 1);
r = await as('authenticated', contentId, `insert into stories (slug, title, status) values ('s2','Draft2','draft') returning id`);
const d2 = r.rows[0].id;
await as('authenticated', contentId, `insert into content_translations (content_type, content_id, language_code, fields) values ('story','${d2}','fa','{"title":"x"}')`);
r = await as('anon', null, `select language_code from content_translations`);
check('anon cannot read translation of draft story', r.rows?.length === 1);
r = await as('authenticated', parentId, `insert into content_translations (content_type, content_id, language_code, fields) values ('story','${pubId}','fa','{}')`);
check('parent cannot write translations', !!r.error);

// --- media visibility: only referenced by published content
r = await as('authenticated', contentId, `insert into media (bucket, path, file_name, display_name, kind, mime_type, size_bytes) values ('media-images','stories/a.png','a.png','a','image','image/png',100) returning id`);
const mediaA = r.rows[0].id;
r = await as('authenticated', contentId, `insert into media (bucket, path, file_name, display_name, kind, mime_type, size_bytes) values ('media-images','stories/b.png','b.png','b','image','image/png',200) returning id`);
const mediaB = r.rows[0].id;
r = await as('anon', null, `select id from media`);
check('anon sees no unreferenced media', r.rows?.length === 0);
await as('authenticated', contentId, `update stories set cover_media_id = '${mediaA}' where id = '${pubId}'`);
await as('authenticated', contentId, `update stories set cover_media_id = '${mediaB}' where id = '${d2}'`);
r = await as('anon', null, `select id from media`);
check('anon sees media of published story only', r.rows?.length === 1 && r.rows[0].id === mediaA, JSON.stringify(r));
r = await as('authenticated', contentId, `select * from media_usage('${mediaA}')`);
check('media_usage reports usage', r.rows?.length === 1 && r.rows[0].table_name === 'stories' && r.rows[0].column_name === 'cover_media_id', JSON.stringify(r));
r = await as('authenticated', parentId, `select * from media_usage('${mediaA}')`);
check('media_usage denied to non-admin', !!r.error);
r = await as('anon', null, `select * from media_references`);
check('media_references view not exposed', !!r.error);

// --- admin RPCs
r = await as('authenticated', contentId, `select dashboard_stats() as s`);
check('dashboard_stats works for admin', !r.error && r.rows[0].s.counts.stories.total >= 2, r.error);
check('dashboard_stats storage counts bytes', r.rows?.[0]?.s.storage.total_bytes === 300, JSON.stringify(r.rows?.[0]?.s.storage));
r = await as('authenticated', parentId, `select dashboard_stats() as s`);
check('dashboard_stats denied to parent', !!r.error);
r = await as('anon', null, `select dashboard_stats() as s`);
check('dashboard_stats denied to anon', !!r.error);
r = await as('authenticated', contentId, `select * from recent_content(5)`);
check('recent_content works', !r.error && r.rows.length > 0, r.error);
r = await as('authenticated', contentId, `select * from star_content_counts()`);
check('star_content_counts works', !r.error, r.error);

// --- admin management
r = await as('authenticated', contentId, `select add_admin('parent@x.com', 'content_admin')`);
check('content_admin cannot add admins', !!r.error, r.error);
r = await as('authenticated', superId, `select add_admin('parent@x.com', 'content_admin') as id`);
check('super_admin can add admin', !r.error && !!r.rows[0].id, r.error);
r = await as('authenticated', parentId, `select role from admin_users where auth_user_id = '${parentId}'`);
check('newly added admin can read own row', r.rows?.[0]?.role === 'content_admin');
r = await as('authenticated', contentId, `select count(*)::int as n from admin_users`);
check('content_admin only sees own admin row', r.rows?.[0]?.n === 1, JSON.stringify(r));
r = await as('authenticated', superId, `select count(*)::int as n from admin_users`);
check('super_admin sees all admin rows', r.rows?.[0]?.n === 3);
r = await as('authenticated', superId, `select count(*)::int as n from admin_list_users(null, 10, 0)`);
check('admin_list_users works for super admin', !r.error && r.rows[0].n === 4, r.error);
r = await as('authenticated', contentId, `select * from admin_list_users(null, 10, 0)`);
check('admin_list_users denied to content admin', !!r.error);
r = await as('authenticated', contentId, `update admin_users set role='super_admin' where auth_user_id='${contentId}' returning id`);
check('content_admin cannot self-promote', !r.error && r.rows.length === 0);
r = await as('anon', null, `select * from admin_users`);
check('anon cannot read admin_users', !!r.error);

// --- audit log
r = await as('authenticated', contentId, `select action, entity_label, actor_email from activity_log order by created_at`);
const actions = (r.rows || []).map((x) => x.action);
check('audit: created/published/deleted/unpublished recorded', ['stories.created', 'stories.published', 'stories.deleted', 'stories.unpublished'].every((a) => actions.includes(a)), actions.join(','));
check('audit: actor email recorded', (r.rows || []).every((x) => x.actor_email === 'content@x.com' || x.actor_email === 'super@x.com'));
r = await as('authenticated', parentId, `select * from activity_log`);
check('parent (non-admin... now admin) — skip', true);
const p2 = await as('authenticated', parent2Id, `select * from activity_log`);
check('non-admin cannot read activity_log', !p2.error && p2.rows.length === 0, p2.error);
r = await as('authenticated', contentId, `insert into activity_log (action) values ('forged')`);
check('admins cannot forge audit rows', !!r.error, r.error);
r = await as('anon', null, `select * from activity_log`);
check('anon cannot read activity_log', !!r.error);
r = await as('authenticated', contentId, `select log_admin_login()`);
r = await as('authenticated', contentId, `select action from activity_log where action = 'admin.login'`);
check('login logged', r.rows?.length === 1);

// --- parents own data
r = await as('authenticated', parent2Id, `insert into profiles (id, display_name) values ('${parent2Id}', 'P2') returning id`);
check('parent creates own profile', r.rows?.length === 1, r.error);
r = await as('authenticated', parent2Id, `insert into profiles (id, display_name) values ('${superId}', 'evil')`);
check('parent cannot create profile for someone else', !!r.error);
r = await as('authenticated', parent2Id, `insert into children (parent_id, name, gender, age) values ('${parent2Id}', 'Kid', 'boy', 7) returning id`);
const kid = r.rows?.[0]?.id;
check('parent adds own child', !!kid, r.error);
r = await as('authenticated', parent2Id, `insert into child_progress (child_id, xp) values ('${kid}', 10) returning id`);
check('parent adds progress for own child', r.rows?.length === 1, r.error);
r = await as('authenticated', contentId, `select * from children`);
check("admins cannot read children rows", !r.error && r.rows.length === 0);
r = await as('authenticated', parentId, `select * from child_progress`);
check("other parent cannot read progress", !r.error && r.rows.length === 0);
r = await as('anon', null, `select * from children`);
check('anon cannot read children', !!r.error);

// --- storage policies
await db.exec(`insert into storage.objects (bucket_id, name) values ('media-images', 'x.png')`);
r = await as('authenticated', contentId, `select name from storage.objects`);
check('admin can list storage objects', r.rows?.length === 1);
r = await as('authenticated', parent2Id, `select name from storage.objects`);
check('non-admin cannot list storage objects', r.rows?.length === 0);
r = await as('authenticated', parent2Id, `insert into storage.objects (bucket_id, name) values ('media-images', 'evil.png')`);
check('non-admin cannot upload', !!r.error);
r = await as('authenticated', contentId, `insert into storage.objects (bucket_id, name) values ('media-images', 'ok.png') returning id`);
check('admin can upload', r.rows?.length === 1, r.error);
r = await as('authenticated', contentId, `insert into storage.objects (bucket_id, name) values ('some-other-bucket', 'ok.png')`);
check('admin cannot write to non-CMS buckets', !!r.error);
r = await as('anon', null, `insert into storage.objects (bucket_id, name) values ('media-images', 'evil.png')`);
check('anon cannot upload', !!r.error);
r = await as('anon', null, `select id, public from storage.buckets order by id`);
check('4 public buckets exist', r.rows?.length === 4 && r.rows.every((b) => b.public));

// --- daily star date gating
await as('authenticated', contentId, `insert into daily_stars (scheduled_date, title, status) values (current_date + 5, 'Future', 'published'), (current_date, 'Today', 'published')`);
r = await as('anon', null, `select title from daily_stars`);
check('anon sees today but not future daily star', r.rows?.length === 1 && r.rows[0].title === 'Today', JSON.stringify(r));
r = await as('authenticated', contentId, `insert into daily_stars (scheduled_date, title) values (current_date, 'Dup')`);
check('duplicate daily star date rejected', !!r.error, r.error);

// --- child tables via parent
r = await as('authenticated', contentId, `insert into quizzes (slug, title, status) values ('q1','Quiz','draft') returning id`);
const qz = r.rows[0].id;
await as('authenticated', contentId, `insert into quiz_questions (quiz_id, prompt, options, correct_index) values ('${qz}', 'Q?', '["a","b"]', 1)`);
r = await as('anon', null, `select * from quiz_questions`);
check('quiz questions hidden while quiz is draft', r.rows?.length === 0);
await as('authenticated', contentId, `update quizzes set status='published' where id='${qz}'`);
r = await as('anon', null, `select * from quiz_questions`);
check('quiz questions visible once published', r.rows?.length === 1);

// --- translation cleanup on hard delete
await as('authenticated', superId, `delete from stories where id='${pubId}'`);
r = await db.query(`select count(*)::int n from content_translations where content_id='${pubId}'`);
check('translations cleaned on hard delete', r.rows[0].n === 0);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
