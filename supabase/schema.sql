-- Chronos DB schema v2 (Phase 1) — docs/chronos-spec-v2-addendum.md 準拠
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて Run（1回のみ。冪等に書いてある）
-- 認証ユーザー(auth.users)は Supabase Auth 管理。ここでは公開読み取りに必要なテーブルとRLSを定義する。

create extension if not exists pgcrypto;

-- ───────── users（公開プロフィール用の最小列。auth.users と 1:1）
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  bio text not null default '',
  country text,                       -- ISO 3166-1 alpha-2（登録時申告）
  age_band text check (age_band in ('adult','minor')),
  created_at timestamptz not null default now()
);

-- ───────── timelines
create table if not exists public.timelines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,          -- URL用（例: tech-ai-revolution）
  owner_id uuid references public.users(id) on delete set null,
  title text not null,
  description text not null default '',
  category text not null check (category in
    ('technology','history-politics','culture','science-nature','business','personal-life')),
  language text not null default 'ja',
  visibility text not null default 'private' check (visibility in ('public','unlisted','private')),
  share_id text unique,
  start_year int,
  end_year int,
  like_count int not null default 0,
  bookmark_count int not null default 0,
  cover_seed text,
  cover_photo_id text,                -- Unsplash photo id（カバーの正）
  cover_url text,                     -- images.unsplash.com raw URL（?以降除去）
  cover_credit jsonb,                 -- {name,user_link,photo_link,download_location}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────── layers（1年表につき最大7本想定）
create table if not exists public.layers (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references public.timelines(id) on delete cascade,
  name text not null check (char_length(name) <= 30),
  color text not null check (color in ('blue','green','pink','gold','purple','teal','orange')),
  position int not null default 0
);

-- ───────── events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references public.timelines(id) on delete cascade,
  layer_id uuid references public.layers(id) on delete set null,
  event_date date not null,
  end_date date,
  date_precision text not null default 'day' check (date_precision in ('year','month','day')),
  event_type text not null default 'point' check (event_type in ('point','period')),
  title text not null,
  summary text not null default '',
  detail text,
  credibility text not null default 'unverified' check (credibility in ('verified','disputed','unverified')),
  credibility_note text,
  origin text not null default 'user' check (origin in ('user','ai')),   -- AI下書き由来かどうか（未検証バッジ用）
  position int not null default 0,
  constraint events_period_chk check (event_type <> 'period' or (end_date is not null and end_date >= event_date))
);

create table if not exists public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  url text
);

create index if not exists events_timeline_idx on public.events(timeline_id, event_date);
create index if not exists timelines_public_idx on public.timelines(visibility, category);

-- ───────── RLS: 公開年表と公開ユーザー情報は誰でも読める（プロトタイプはこれで十分）
alter table public.users enable row level security;
alter table public.timelines enable row level security;
alter table public.layers enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;

drop policy if exists "public read users" on public.users;
create policy "public read users" on public.users for select using (true);

drop policy if exists "public read timelines" on public.timelines;
create policy "public read timelines" on public.timelines for select
  using (visibility in ('public','unlisted'));

drop policy if exists "public read layers" on public.layers;
create policy "public read layers" on public.layers for select
  using (exists (select 1 from public.timelines t where t.id = timeline_id and t.visibility in ('public','unlisted')));

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select
  using (exists (select 1 from public.timelines t where t.id = timeline_id and t.visibility in ('public','unlisted')));

drop policy if exists "public read event_sources" on public.event_sources;
create policy "public read event_sources" on public.event_sources for select
  using (exists (select 1 from public.events e join public.timelines t on t.id = e.timeline_id
                 where e.id = event_id and t.visibility in ('public','unlisted')));

-- 書き込みポリシー（本人のみ）は Next.js 実装時に追加。シードは SQL Editor（service role）で投入する。
