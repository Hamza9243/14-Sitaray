# 14 Stars — Supabase backend & Content Studio

The admin dashboard (`/admin`) and the child app both talk to one Supabase project.

```
supabase/
  migrations/20260101000000_cms_schema.sql   tables, RLS policies, triggers, RPCs, storage buckets & policies
  seed.sql                                   languages, categories, 14 Stars, Ali/Sakina + the app's existing content
  create_first_admin.sql                     promote your first super admin
  tools/generate-seed.mjs                    regenerates seed.sql from src/data
  tools/fake-supabase.mjs                    local Supabase stand-in (no Docker) used for development & tests
  tests/rls.test.mjs                         RLS / trigger / RPC test-suite (runs the real SQL in Postgres)
```

## 1. Set up a Supabase project

1. Create a project at supabase.com.
2. Open **SQL Editor** and run, in order: `migrations/20260101000000_cms_schema.sql`, then `seed.sql`.
   (or with the CLI: `supabase link --project-ref <ref> && supabase db push`, then run `seed.sql`).
3. **Authentication → Providers**: keep *Email* enabled. **Authentication → URL configuration**: add
   `https://YOUR-DOMAIN/admin/reset-password` to *Redirect URLs* (needed for “Forgot password”).
   For an admin-only project you may also turn **off** “Allow new users to sign up”.
4. Copy the project URL and anon key into `.env` (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   Both values are safe in the browser — the anon key can only do what the RLS policies allow.

## 2. Create the first admin

1. **Authentication → Users → Add user** (email + password, tick *Auto confirm*).
2. Run `create_first_admin.sql` in the SQL editor after replacing the email.
3. Open `/admin/login` and sign in. More admins can then be added from **Users** (super admins only).

## 3. Roles

| Role | Can do |
| --- | --- |
| `super_admin` | everything, incl. permanent delete, users/admins, languages, settings, upload limits |
| `content_admin` | create/edit/publish/unpublish/soft-delete content and media |
| anyone else | read **published** content (and the media it references) — nothing else |

Parents can only read/write their own `profiles`, `children` and `child_progress`. Admins can see the
number of children per parent but never the children's rows.

## 4. How the child app reads content

The child app uses an anonymous client (`src/lib/supabase.ts → getPublicClient`) that never keeps a session,
so it always sees exactly what the public sees: rows with `status = 'published'` and `deleted_at is null`
(Daily Stars additionally need `scheduled_date <= today`), the translations of those rows, and the media
files they reference. Content is cached locally (stale-while-revalidate) and the app falls back to its bundled
content when Supabase is unreachable or empty. Publishing/unpublishing in the dashboard therefore changes
the app without a new build.

## 5. Languages

Base columns hold the **default language** (English). Other languages are overlays in
`content_translations (content_type, content_id, language_code, fields jsonb)`; missing fields fall back to the
default language. Adding a language: **Languages → Add language**.

## 6. Storage

Buckets (`media-images`, `media-audio`, `media-animation`, `media-video`) are public-read by URL (the app
streams them) but only admins can list, upload, replace or delete. Object names are random UUIDs.
Limits: images 10 MB, audio 50 MB, animation 20 MB, video 50 MB (adjustable downwards in **Settings**).

## 7. Local development without Supabase / Docker

```
npm run supabase:fake          # real Postgres (PGlite) + migration + seed on http://localhost:54321
# in .env.local:
#   VITE_SUPABASE_URL=http://localhost:54321
#   VITE_SUPABASE_ANON_KEY=<anon key printed by the command>
# create an admin:  POST http://localhost:54321/__test/create-user  {"email","password","role":"super_admin"}
npm run supabase:test          # RLS test-suite
```

## 8. Deploying `/admin`

`/admin` is a client-side route of the same Vite app. Host the `dist/` folder with an SPA fallback
(all paths → `index.html`) so deep links like `/admin/stories` work. The Capacitor Android app bundles the
same code but has no way to reach `/admin` (no URL bar).
