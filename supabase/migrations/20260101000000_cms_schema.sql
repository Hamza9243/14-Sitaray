-- =============================================================================
-- 14 Stars — CMS schema
--
-- Language model: every translatable content table stores the DEFAULT language
-- (languages.is_default, English out of the box) in its own columns. Every other
-- language lives in `content_translations` as a jsonb overlay keyed by
-- (content_type, content_id, language_code) — records are never duplicated per language.
--
-- Security model: the admin_users table decides who is an admin (super_admin /
-- content_admin). Public (anon + authenticated) visitors can only read PUBLISHED,
-- non-deleted content and the media that published content references. Only admins can
-- write; only super_admins can hard-delete (content admins soft-delete via deleted_at).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Stamps published_at the first time a row becomes published.
create or replace function public.cms_status_stamp() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = now();
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Languages, admin users
-- ----------------------------------------------------------------------------
create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,3}(-[A-Za-z]{2,4})?$'),
  name text not null,
  native_name text not null,
  direction text not null default 'ltr' check (direction in ('ltr', 'rtl')),
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index languages_single_default on public.languages (is_default) where is_default;

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'content_admin' check (role in ('super_admin', 'content_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where auth_user_id = auth.uid());
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where auth_user_id = auth.uid() and role = 'super_admin');
$$;

-- ----------------------------------------------------------------------------
-- Media (metadata for files in Supabase Storage)
-- ----------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('media-images', 'media-audio', 'media-animation', 'media-video')),
  path text not null,
  thumbnail_path text,
  file_name text not null,
  display_name text not null,
  kind text not null check (kind in ('image', 'audio', 'animation', 'video', 'other')),
  mime_type text,
  size_bytes bigint not null default 0,
  width int,
  height int,
  duration_seconds numeric,
  folder text not null default 'general',
  alt_text text,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket, path)
);
create index media_kind_idx on public.media (kind) where deleted_at is null;
create index media_created_idx on public.media (created_at desc);

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  scopes text[] not null default array['story', 'dua', 'game', 'good_deed', 'reflection', 'wisdom', 'audio', 'quiz'],
  is_enabled boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index categories_slug_uq on public.categories (slug) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Content tables. `status` = draft | published | unpublished; `deleted_at` = soft delete.
-- ----------------------------------------------------------------------------
create table public.stars (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number between 1 and 14),
  slug text not null unique,
  name text not null,
  title text,
  description text,
  qualities text,
  image_media_id uuid references public.media (id) on delete set null,
  background_media_id uuid references public.media (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  gender text not null check (gender in ('boy', 'girl')),
  description text,
  language_code text references public.languages (code) on update cascade on delete set null,
  is_active boolean not null default true,
  main_media_id uuid references public.media (id) on delete set null,
  talking_media_id uuid references public.media (id) on delete set null,
  happy_media_id uuid references public.media (id) on delete set null,
  sad_media_id uuid references public.media (id) on delete set null,
  thinking_media_id uuid references public.media (id) on delete set null,
  surprised_media_id uuid references public.media (id) on delete set null,
  talking_animation_media_id uuid references public.media (id) on delete set null,
  idle_animation_media_id uuid references public.media (id) on delete set null,
  voice_media_id uuid references public.media (id) on delete set null,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Any number of extra named assets per character (e.g. voice_story, voice_welcome, wave_animation).
create table public.character_assets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  asset_key text not null check (asset_key ~ '^[a-z0-9_]+$'),
  label text,
  media_id uuid not null references public.media (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (character_id, asset_key)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  short_description text,
  body text,
  moral text,
  takeaway text,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  age_group text not null default 'all',
  duration_minutes int,
  xp_reward int not null default 25 check (xp_reward >= 0),
  cover_media_id uuid references public.media (id) on delete set null,
  background_media_id uuid references public.media (id) on delete set null,
  narration_media_id uuid references public.media (id) on delete set null,
  -- Optional structured extras the child app understands (quiz, sequence_events, moral_choice, badge, pages).
  extras jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index stories_slug_uq on public.stories (slug) where deleted_at is null;
create index stories_star_idx on public.stories (star_id);

create table public.story_scenes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  scene_order int not null default 0,
  name text not null,
  text text,
  background_media_id uuid references public.media (id) on delete set null,
  character_id uuid references public.characters (id) on delete set null,
  character_position text not null default 'center' check (character_position in ('left', 'center', 'right')),
  character_expression text not null default 'happy'
    check (character_expression in ('happy', 'sad', 'thinking', 'surprised', 'neutral')),
  animation text not null default 'idle' check (animation in ('idle', 'talking', 'none')),
  animation_media_id uuid references public.media (id) on delete set null,
  audio_media_id uuid references public.media (id) on delete set null,
  duration_seconds numeric not null default 6 check (duration_seconds > 0),
  transition text not null default 'fade' check (transition in ('none', 'fade', 'slide', 'zoom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index story_scenes_story_idx on public.story_scenes (story_id, scene_order);

create table public.audio (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audio_type text not null default 'story_narration'
    check (audio_type in ('story_narration', 'dua', 'character_voice', 'game_sound', 'background_music', 'sound_effect')),
  language_code text references public.languages (code) on update cascade on delete set null,
  story_id uuid references public.stories (id) on delete set null,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  media_id uuid not null references public.media (id) on delete restrict,
  thumbnail_media_id uuid references public.media (id) on delete set null,
  description text,
  duration_seconds numeric,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.duas (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  arabic_text text not null,
  transliteration text,
  translation text,
  explanation text,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  age_group text not null default 'all',
  xp_reward int not null default 15 check (xp_reward >= 0),
  audio_media_id uuid references public.media (id) on delete set null,
  cover_media_id uuid references public.media (id) on delete set null,
  -- Optional structured extras (repeat segments, concept emojis/labels, meaning emoji …).
  extras jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index duas_slug_uq on public.duas (slug) where deleted_at is null;

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  instructions text,
  quality text,
  game_type text not null default 'multiple_choice' check (
    game_type in ('quiz', 'multiple_choice', 'true_false', 'matching', 'memory', 'sequence', 'drag_drop',
                  'story_choice', 'good_deed_challenge')
  ),
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  age_group text not null default 'all',
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  thumbnail_media_id uuid references public.media (id) on delete set null,
  background_media_id uuid references public.media (id) on delete set null,
  sound_media_id uuid references public.media (id) on delete set null,
  reward_points int not null default 50 check (reward_points >= 0),
  reward_stars int not null default 0 check (reward_stars >= 0),
  -- Game-level settings the engine reads (e.g. drag_drop bucket labels, prompt, badge title, closing line).
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index games_slug_uq on public.games (slug) where deleted_at is null;

-- One row per question / pair / step / sortable item, depending on the game type.
create table public.game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  sort_order int not null default 0,
  question_type text not null check (question_type in ('choice', 'pair', 'step', 'sort_item')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index game_questions_game_idx on public.game_questions (game_id, sort_order);

create table public.daily_stars (
  id uuid primary key default gen_random_uuid(),
  scheduled_date date not null,
  star_id uuid references public.stars (id) on delete set null,
  title text not null,
  short_story text,
  lesson text,
  takeaway text,
  duration_minutes int,
  cover_media_id uuid references public.media (id) on delete set null,
  audio_media_id uuid references public.media (id) on delete set null,
  scene_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index daily_stars_date_uq on public.daily_stars (scheduled_date) where deleted_at is null;

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  points_per_question int not null default 10 check (points_per_question >= 0),
  passing_score int not null default 60 check (passing_score between 0 and 100),
  time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds > 0),
  questions_per_attempt int check (questions_per_attempt is null or questions_per_attempt > 0),
  is_daily boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index quizzes_slug_uq on public.quizzes (slug) where deleted_at is null;

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  sort_order int not null default 0,
  question_type text not null default 'multiple_choice' check (question_type in ('multiple_choice', 'true_false')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0 check (correct_index >= 0),
  explanation text,
  points int check (points is null or points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

create table public.good_deeds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon_emoji text,
  icon_media_id uuid references public.media (id) on delete set null,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  difficulty text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard')),
  points int not null default 5 check (points >= 0),
  age_group text not null default 'all',
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  description text,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  age_group text not null default 'all',
  image_media_id uuid references public.media (id) on delete set null,
  audio_media_id uuid references public.media (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wisdom (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  wisdom_text text not null,
  arabic_text text,
  translation text,
  explanation text,
  star_id uuid references public.stars (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  image_media_id uuid references public.media (id) on delete set null,
  audio_media_id uuid references public.media (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  published_at timestamptz,
  display_order int not null default 0,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extra many-to-many associations between a Star and any content item
-- (a content row's own star_id is its PRIMARY star; this table adds further links, e.g. "activity").
create table public.star_content (
  id uuid primary key default gen_random_uuid(),
  star_id uuid not null references public.stars (id) on delete cascade,
  content_type text not null check (
    content_type in ('story', 'game', 'audio', 'dua', 'quiz', 'good_deed', 'reflection', 'wisdom', 'activity')
  ),
  content_id uuid not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (star_id, content_type, content_id)
);

-- Non-default-language overlays for any translatable record.
create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (
    content_type in ('star', 'story', 'story_scene', 'dua', 'game', 'game_question', 'daily_star', 'quiz',
                     'quiz_question', 'good_deed', 'reflection', 'wisdom', 'category', 'audio', 'character')
  ),
  content_id uuid not null,
  language_code text not null references public.languages (code) on update cascade on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id, language_code)
);
create index content_translations_lookup_idx on public.content_translations (content_type, language_code);

-- ----------------------------------------------------------------------------
-- Settings, audit log, parent/child data
-- ----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferred_language text references public.languages (code) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  gender text check (gender in ('boy', 'girl')),
  age int check (age between 2 and 18),
  language_code text references public.languages (code) on update cascade on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null unique references public.children (id) on delete cascade,
  xp int not null default 0,
  streak_count int not null default 0,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Triggers: updated_at + published_at
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'languages', 'media', 'categories', 'stars', 'characters', 'stories', 'story_scenes', 'audio', 'duas',
    'games', 'game_questions', 'daily_stars', 'quizzes', 'quiz_questions', 'good_deeds', 'reflections',
    'wisdom', 'content_translations', 'app_settings', 'profiles', 'children', 'child_progress'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;

  foreach t in array array['stars', 'stories', 'audio', 'duas', 'games', 'daily_stars', 'quizzes', 'good_deeds',
                           'reflections', 'wisdom'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.cms_status_stamp()',
                   t || '_status_stamp', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Publication helpers (SECURITY DEFINER so public visitors never need direct access to parents)
-- ----------------------------------------------------------------------------
create or replace function public.content_is_published(p_type text, p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case p_type
    when 'star' then exists (select 1 from stars where id = p_id and status = 'published' and deleted_at is null)
    when 'story' then exists (select 1 from stories where id = p_id and status = 'published' and deleted_at is null)
    when 'story_scene' then exists (
      select 1 from story_scenes sc join stories s on s.id = sc.story_id
      where sc.id = p_id and s.status = 'published' and s.deleted_at is null)
    when 'dua' then exists (select 1 from duas where id = p_id and status = 'published' and deleted_at is null)
    when 'game' then exists (select 1 from games where id = p_id and status = 'published' and deleted_at is null)
    when 'game_question' then exists (
      select 1 from game_questions gq join games g on g.id = gq.game_id
      where gq.id = p_id and g.status = 'published' and g.deleted_at is null)
    when 'daily_star' then exists (
      select 1 from daily_stars where id = p_id and status = 'published' and deleted_at is null
        and scheduled_date <= current_date)
    when 'quiz' then exists (select 1 from quizzes where id = p_id and status = 'published' and deleted_at is null)
    when 'quiz_question' then exists (
      select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
      where qq.id = p_id and q.status = 'published' and q.deleted_at is null)
    when 'good_deed' then exists (select 1 from good_deeds where id = p_id and status = 'published' and deleted_at is null)
    when 'reflection' then exists (select 1 from reflections where id = p_id and status = 'published' and deleted_at is null)
    when 'wisdom' then exists (select 1 from wisdom where id = p_id and status = 'published' and deleted_at is null)
    when 'category' then exists (select 1 from categories where id = p_id and is_enabled and deleted_at is null)
    when 'audio' then exists (select 1 from audio where id = p_id and status = 'published' and deleted_at is null)
    when 'character' then exists (select 1 from characters where id = p_id and is_active and deleted_at is null)
    else false
  end;
$$;

-- Every place a media row can be referenced from. Columns named `media_id` / `*_media_id` are
-- discovered automatically from each row's JSON, so adding a new `xyz_media_id` column needs no change here;
-- only a NEW TABLE needs a new entry in the array below.
do $$
declare
  v_sql text := '';
  r record;
begin
  for r in select * from (values
    ('stars', 't.status = ''published'' and t.deleted_at is null'),
    ('characters', 't.is_active and t.deleted_at is null'),
    ('character_assets', 'exists (select 1 from characters c where c.id = t.character_id and c.is_active and c.deleted_at is null)'),
    ('stories', 't.status = ''published'' and t.deleted_at is null'),
    ('story_scenes', 'exists (select 1 from stories s where s.id = t.story_id and s.status = ''published'' and s.deleted_at is null)'),
    ('audio', 't.status = ''published'' and t.deleted_at is null'),
    ('duas', 't.status = ''published'' and t.deleted_at is null'),
    ('games', 't.status = ''published'' and t.deleted_at is null'),
    ('daily_stars', 't.status = ''published'' and t.deleted_at is null'),
    ('good_deeds', 't.status = ''published'' and t.deleted_at is null'),
    ('reflections', 't.status = ''published'' and t.deleted_at is null'),
    ('wisdom', 't.status = ''published'' and t.deleted_at is null')
  ) as x (tbl, pub) loop
    v_sql := v_sql || case when v_sql = '' then '' else ' union all ' end || format(
      'select %L::text as table_name, t.id as record_id, j.key::text as column_name, j.value::uuid as media_id, '
      'coalesce(to_jsonb(t)->>''title'', to_jsonb(t)->>''name'', to_jsonb(t)->>''question'', to_jsonb(t)->>''slug'') as label, '
      '(%s) as is_published from public.%I t, jsonb_each_text(to_jsonb(t)) j '
      'where j.key like ''%%media\_id'' and j.value is not null',
      r.tbl, r.pub, r.tbl);
  end loop;
  execute 'create or replace view public.media_references as ' || v_sql;
end $$;

revoke all on public.media_references from public, anon, authenticated;

create or replace function public.media_is_published(p_media_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from media_references where media_id = p_media_id and is_published);
$$;

create or replace function public.media_usage(p_media_id uuid)
returns table (table_name text, record_id uuid, column_name text, label text, is_published boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select r.table_name, r.record_id, r.column_name, r.label, r.is_published
    from media_references r where r.media_id = p_media_id order by r.table_name, r.label;
end $$;

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
create or replace function public.cms_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_action text;
  v_email text;
begin
  -- Only record actions performed by a signed-in admin (skips migrations / seeds / service role).
  if auth.uid() is null or not is_admin() then
    return coalesce(new, old);
  end if;
  select email into v_email from admin_users where auth_user_id = auth.uid();

  if tg_op = 'INSERT' then
    v_action := 'created';
  elsif tg_op = 'DELETE' then
    v_action := 'deleted';
  elsif (v_old->>'deleted_at') is null and (v_new->>'deleted_at') is not null then
    v_action := 'deleted';
  elsif (v_old->>'deleted_at') is not null and (v_new->>'deleted_at') is null then
    v_action := 'restored';
  elsif (v_old->>'status') is distinct from (v_new->>'status') and (v_new->>'status') = 'published' then
    v_action := 'published';
  elsif (v_old->>'status') is distinct from (v_new->>'status') and (v_new->>'status') = 'unpublished' then
    v_action := 'unpublished';
  else
    v_action := 'updated';
  end if;

  insert into activity_log (actor_id, actor_email, action, entity_type, entity_id, entity_label, details)
  values (
    auth.uid(), v_email, tg_table_name || '.' || v_action, tg_table_name, (v_row->>'id')::uuid,
    coalesce(v_row->>'title', v_row->>'name', v_row->>'question', v_row->>'display_name', v_row->>'file_name',
             v_row->>'email', v_row->>'slug', v_row->>'key', v_row->>'code'),
    case when tg_op = 'UPDATE' then jsonb_build_object('status', v_new->>'status') else '{}'::jsonb end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'stars', 'characters', 'stories', 'story_scenes', 'audio', 'duas', 'games', 'game_questions', 'daily_stars',
    'quizzes', 'quiz_questions', 'good_deeds', 'reflections', 'wisdom', 'categories', 'media', 'languages',
    'app_settings', 'admin_users'
  ] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.cms_audit()',
                   t || '_audit', t);
  end loop;
end $$;

create or replace function public.log_admin_login() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then return; end if;
  insert into activity_log (actor_id, actor_email, action, entity_type)
  select auth.uid(), email, 'admin.login', 'admin_users' from admin_users where auth_user_id = auth.uid();
end $$;

-- Removes a record's translations when the record itself is hard-deleted.
create or replace function public.cms_delete_translations() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from content_translations where content_type = tg_argv[0] and content_id = old.id;
  return old;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('stars', 'star'), ('stories', 'story'), ('story_scenes', 'story_scene'), ('duas', 'dua'), ('games', 'game'),
    ('game_questions', 'game_question'), ('daily_stars', 'daily_star'), ('quizzes', 'quiz'),
    ('quiz_questions', 'quiz_question'), ('good_deeds', 'good_deed'), ('reflections', 'reflection'),
    ('wisdom', 'wisdom'), ('categories', 'category'), ('audio', 'audio'), ('characters', 'character')
  ) as x (tbl, ctype) loop
    execute format('create trigger %I after delete on public.%I for each row execute function public.cms_delete_translations(%L)',
                   r.tbl || '_cleanup_translations', r.tbl, r.ctype);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Dashboard / admin RPCs
-- ----------------------------------------------------------------------------
create or replace function public.dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_counts jsonb := '{}'::jsonb;
  t text;
  v_total int; v_pub int; v_draft int; v_unpub int;
  v_default text;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  foreach t in array array['stars', 'stories', 'audio', 'duas', 'games', 'daily_stars', 'quizzes', 'good_deeds',
                           'reflections', 'wisdom'] loop
    execute format(
      'select count(*), count(*) filter (where status = ''published''), count(*) filter (where status = ''draft''), '
      'count(*) filter (where status = ''unpublished'') from public.%I where deleted_at is null', t)
      into v_total, v_pub, v_draft, v_unpub;
    v_counts := v_counts || jsonb_build_object(t, jsonb_build_object(
      'total', v_total, 'published', v_pub, 'draft', v_draft, 'unpublished', v_unpub));
  end loop;

  select code into v_default from languages where is_default limit 1;

  return jsonb_build_object(
    'counts', v_counts,
    'characters', (select count(*) from characters where deleted_at is null),
    'media', (select count(*) from media where deleted_at is null),
    'users', (select count(*) from profiles),
    'storage', jsonb_build_object(
      'total_bytes', (select coalesce(sum(size_bytes), 0) from media where deleted_at is null),
      'by_kind', coalesce((select jsonb_object_agg(kind, bytes) from (
        select kind, sum(size_bytes) as bytes from media where deleted_at is null group by kind) k), '{}'::jsonb)
    ),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc) from (
      select c.name, count(*) as n from (
        select category_id from stories where deleted_at is null and category_id is not null
        union all select category_id from duas where deleted_at is null and category_id is not null
        union all select category_id from games where deleted_at is null and category_id is not null
        union all select category_id from good_deeds where deleted_at is null and category_id is not null
        union all select category_id from reflections where deleted_at is null and category_id is not null
        union all select category_id from wisdom where deleted_at is null and category_id is not null
        union all select category_id from audio where deleted_at is null and category_id is not null
      ) x join categories c on c.id = x.category_id group by c.name) y), '[]'::jsonb),
    'by_language', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'name', name, 'count', n) order by n desc) from (
      select l.code, l.name,
        case when l.code = v_default
          then (select count(*) from stories where deleted_at is null) + (select count(*) from duas where deleted_at is null)
             + (select count(*) from games where deleted_at is null) + (select count(*) from good_deeds where deleted_at is null)
             + (select count(*) from reflections where deleted_at is null) + (select count(*) from wisdom where deleted_at is null)
          else (select count(*) from content_translations ct
                where ct.language_code = l.code and ct.content_type in ('story', 'dua', 'game', 'good_deed', 'reflection', 'wisdom'))
        end as n
      from languages l where l.is_enabled) z), '[]'::jsonb)
  );
end $$;

create or replace function public.recent_content(p_limit int default 8)
returns table (entity_type text, id uuid, label text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select * from (
      select 'stories'::text, s.id, s.title, s.status, s.created_at, s.updated_at from stories s where s.deleted_at is null
      union all select 'duas', d.id, d.name, d.status, d.created_at, d.updated_at from duas d where d.deleted_at is null
      union all select 'games', g.id, g.name, g.status, g.created_at, g.updated_at from games g where g.deleted_at is null
      union all select 'audio', a.id, a.name, a.status, a.created_at, a.updated_at from audio a where a.deleted_at is null
      union all select 'daily_stars', ds.id, ds.title, ds.status, ds.created_at, ds.updated_at from daily_stars ds where ds.deleted_at is null
      union all select 'quizzes', q.id, q.title, q.status, q.created_at, q.updated_at from quizzes q where q.deleted_at is null
      union all select 'good_deeds', gd.id, gd.title, gd.status, gd.created_at, gd.updated_at from good_deeds gd where gd.deleted_at is null
      union all select 'reflections', r.id, r.question, r.status, r.created_at, r.updated_at from reflections r where r.deleted_at is null
      union all select 'wisdom', w.id, w.title, w.status, w.created_at, w.updated_at from wisdom w where w.deleted_at is null
    ) all_content (entity_type, id, label, status, created_at, updated_at)
    order by greatest(all_content.created_at, all_content.updated_at) desc
    limit p_limit;
end $$;

-- How much content each Star has, counting the primary star_id plus star_content links, each item once.
create or replace function public.star_content_counts() returns table (star_id uuid, content_type text, n bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select x.star_id, x.content_type, count(*) from (
      select s.star_id, 'story'::text as content_type, s.id as cid from stories s where s.deleted_at is null and s.star_id is not null
      union select g.star_id, 'game', g.id from games g where g.deleted_at is null and g.star_id is not null
      union select a.star_id, 'audio', a.id from audio a where a.deleted_at is null and a.star_id is not null
      union select d.star_id, 'dua', d.id from duas d where d.deleted_at is null and d.star_id is not null
      union select q.star_id, 'quiz', q.id from quizzes q where q.deleted_at is null and q.star_id is not null
      union select gd.star_id, 'good_deed', gd.id from good_deeds gd where gd.deleted_at is null and gd.star_id is not null
      union select r.star_id, 'reflection', r.id from reflections r where r.deleted_at is null and r.star_id is not null
      union select w.star_id, 'wisdom', w.id from wisdom w where w.deleted_at is null and w.star_id is not null
      union select sc.star_id, sc.content_type, sc.content_id from star_content sc
    ) x group by x.star_id, x.content_type;
end $$;

create or replace function public.admin_list_users(p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, admin_role text,
  display_name text, children_count bigint, total_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, au.role, p.display_name,
           (select count(*) from children c where c.parent_id = u.id),
           count(*) over ()
    from auth.users u
    left join admin_users au on au.auth_user_id = u.id
    left join profiles p on p.id = u.id
    where p_search is null or p_search = '' or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    order by u.created_at desc
    limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end $$;

-- Grants an existing (already signed-up) auth user admin access. Super admins only.
create or replace function public.add_admin(p_email text, p_role text default 'content_admin') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user auth.users; v_id uuid;
begin
  if not is_super_admin() then
    raise exception 'only a super admin can add admins' using errcode = '42501';
  end if;
  if p_role not in ('super_admin', 'content_admin') then
    raise exception 'invalid role';
  end if;
  select * into v_user from auth.users where lower(email) = lower(p_email);
  if not found then
    raise exception 'No account with that email. Create the user in Supabase Auth first.';
  end if;
  insert into admin_users (auth_user_id, email, role) values (v_user.id, v_user.email, p_role)
  on conflict (auth_user_id) do update set role = excluded.role
  returning id into v_id;
  return v_id;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke all on public.media_references from public, anon, authenticated;

-- Status-based content tables: public reads published only; admins read/write; super admins hard-delete.
do $$
declare t text;
begin
  foreach t in array array['stars', 'stories', 'audio', 'duas', 'games', 'quizzes', 'good_deeds', 'reflections', 'wisdom'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read published" on public.%I for select to anon, authenticated using (status = ''published'' and deleted_at is null)', t);
    execute format('create policy "admin read all" on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "super admin hard delete" on public.%I for delete to authenticated using (public.is_super_admin())', t);
  end loop;
end $$;

-- Daily stars are only public once their date has arrived.
alter table public.daily_stars enable row level security;
create policy "public read published" on public.daily_stars for select to anon, authenticated
  using (status = 'published' and deleted_at is null and scheduled_date <= current_date);
create policy "admin read all" on public.daily_stars for select to authenticated using (public.is_admin());
create policy "admin insert" on public.daily_stars for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.daily_stars for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "super admin hard delete" on public.daily_stars for delete to authenticated using (public.is_super_admin());

-- Child tables inherit visibility from their parent.
alter table public.story_scenes enable row level security;
create policy "public read via story" on public.story_scenes for select to anon, authenticated
  using (public.content_is_published('story', story_id));
create policy "admin read all" on public.story_scenes for select to authenticated using (public.is_admin());
create policy "admin insert" on public.story_scenes for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.story_scenes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.story_scenes for delete to authenticated using (public.is_admin());

alter table public.game_questions enable row level security;
create policy "public read via game" on public.game_questions for select to anon, authenticated
  using (public.content_is_published('game', game_id));
create policy "admin read all" on public.game_questions for select to authenticated using (public.is_admin());
create policy "admin insert" on public.game_questions for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.game_questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.game_questions for delete to authenticated using (public.is_admin());

alter table public.quiz_questions enable row level security;
create policy "public read via quiz" on public.quiz_questions for select to anon, authenticated
  using (public.content_is_published('quiz', quiz_id));
create policy "admin read all" on public.quiz_questions for select to authenticated using (public.is_admin());
create policy "admin insert" on public.quiz_questions for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.quiz_questions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.quiz_questions for delete to authenticated using (public.is_admin());

-- Characters (active flag instead of status).
alter table public.characters enable row level security;
create policy "public read active" on public.characters for select to anon, authenticated
  using (is_active and deleted_at is null);
create policy "admin read all" on public.characters for select to authenticated using (public.is_admin());
create policy "admin insert" on public.characters for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.characters for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "super admin hard delete" on public.characters for delete to authenticated using (public.is_super_admin());

alter table public.character_assets enable row level security;
create policy "public read via character" on public.character_assets for select to anon, authenticated
  using (public.content_is_published('character', character_id));
create policy "admin read all" on public.character_assets for select to authenticated using (public.is_admin());
create policy "admin insert" on public.character_assets for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.character_assets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.character_assets for delete to authenticated using (public.is_admin());

-- Categories & languages: enabled ones are public.
alter table public.categories enable row level security;
create policy "public read enabled" on public.categories for select to anon, authenticated
  using (is_enabled and deleted_at is null);
create policy "admin read all" on public.categories for select to authenticated using (public.is_admin());
create policy "admin insert" on public.categories for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "super admin hard delete" on public.categories for delete to authenticated using (public.is_super_admin());

alter table public.languages enable row level security;
create policy "public read enabled" on public.languages for select to anon, authenticated using (is_enabled);
create policy "admin read all" on public.languages for select to authenticated using (public.is_admin());
create policy "super admin insert" on public.languages for insert to authenticated with check (public.is_super_admin());
create policy "super admin update" on public.languages for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin delete" on public.languages for delete to authenticated using (public.is_super_admin());

-- Media rows: public may only see files referenced by published content.
alter table public.media enable row level security;
create policy "public read published media" on public.media for select to anon, authenticated
  using (deleted_at is null and public.media_is_published(id));
create policy "admin read all" on public.media for select to authenticated using (public.is_admin());
create policy "admin insert" on public.media for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.media for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "super admin hard delete" on public.media for delete to authenticated using (public.is_super_admin());

alter table public.star_content enable row level security;
create policy "public read via star" on public.star_content for select to anon, authenticated
  using (public.content_is_published('star', star_id));
create policy "admin read all" on public.star_content for select to authenticated using (public.is_admin());
create policy "admin insert" on public.star_content for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.star_content for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.star_content for delete to authenticated using (public.is_admin());

alter table public.content_translations enable row level security;
create policy "public read published translations" on public.content_translations for select to anon, authenticated
  using (public.content_is_published(content_type, content_id));
create policy "admin read all" on public.content_translations for select to authenticated using (public.is_admin());
create policy "admin insert" on public.content_translations for insert to authenticated with check (public.is_admin());
create policy "admin update" on public.content_translations for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.content_translations for delete to authenticated using (public.is_admin());

-- Admin users: an admin sees their own row (route guard); only super admins see/manage everyone.
alter table public.admin_users enable row level security;
create policy "read own or super" on public.admin_users for select to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin());
create policy "super admin insert" on public.admin_users for insert to authenticated with check (public.is_super_admin());
create policy "super admin update" on public.admin_users for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin delete" on public.admin_users for delete to authenticated using (public.is_super_admin());

alter table public.app_settings enable row level security;
create policy "public read public settings" on public.app_settings for select to anon, authenticated using (is_public);
create policy "admin read all" on public.app_settings for select to authenticated using (public.is_admin());
create policy "super admin insert" on public.app_settings for insert to authenticated with check (public.is_super_admin());
create policy "super admin update" on public.app_settings for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super admin delete" on public.app_settings for delete to authenticated using (public.is_super_admin());

-- Activity log: admins read; rows are only ever written by the SECURITY DEFINER audit functions.
alter table public.activity_log enable row level security;
create policy "admin read" on public.activity_log for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.activity_log from anon, authenticated;

-- Parents: their own profile, children and progress. Admins can list profiles (counts) but not children.
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin read profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.children enable row level security;
create policy "parent manages children" on public.children for all to authenticated
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());

alter table public.child_progress enable row level security;
create policy "parent manages progress" on public.child_progress for all to authenticated
  using (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()))
  with check (exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid()));

revoke all on public.admin_users, public.activity_log from anon;
revoke all on public.profiles, public.children, public.child_progress from anon;

-- RPCs: callable by signed-in users, each one re-checks admin rights itself.
revoke execute on function public.dashboard_stats(), public.recent_content(int), public.star_content_counts(),
  public.admin_list_users(text, int, int), public.add_admin(text, text), public.media_usage(uuid),
  public.log_admin_login() from public, anon;
grant execute on function public.dashboard_stats(), public.recent_content(int), public.star_content_counts(),
  public.admin_list_users(text, int, int), public.add_admin(text, text), public.media_usage(uuid),
  public.log_admin_login() to authenticated;

-- ----------------------------------------------------------------------------
-- Storage: one bucket per media kind. Objects are public-READ by URL (the child app streams them);
-- listing and every write is restricted to admins.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  -- No image/svg+xml: the client never lets an admin upload one (see detectKind in src/admin/lib/media.ts),
  -- and since these buckets are public-read, an SVG served back would run as active, script-capable markup
  -- rather than inert image bytes if ever opened directly.
  ('media-images', 'media-images', true, 10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('media-audio', 'media-audio', true, 52428800,
    array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/ogg', 'application/ogg']),
  ('media-animation', 'media-animation', true, 20971520,
    array['application/json', 'image/gif', 'video/webm', 'video/mp4', 'text/plain']),
  ('media-video', 'media-video', true, 52428800,
    array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cms admins list media" on storage.objects for select to authenticated
  using (bucket_id in ('media-images', 'media-audio', 'media-animation', 'media-video') and public.is_admin());
create policy "cms admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('media-images', 'media-audio', 'media-animation', 'media-video') and public.is_admin());
create policy "cms admins update media" on storage.objects for update to authenticated
  using (bucket_id in ('media-images', 'media-audio', 'media-animation', 'media-video') and public.is_admin())
  with check (bucket_id in ('media-images', 'media-audio', 'media-animation', 'media-video') and public.is_admin());
create policy "cms admins delete media" on storage.objects for delete to authenticated
  using (bucket_id in ('media-images', 'media-audio', 'media-animation', 'media-video') and public.is_admin());
