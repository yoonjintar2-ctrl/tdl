-- ═══════════════════════════════════════════════════════════
--  TDL 협업 기능 (동료 · 공유일정 · 쪽지 · 아바타)
--  Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요.
--  여러 번 실행해도 안전합니다.
-- ═══════════════════════════════════════════════════════════

-- ── 1) 프로필 (닉네임 · 아바타) ────────────────────────────
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nickname   text,
  avatar     jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- 내 프로필은 내가 관리
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 로그인한 사람은 다른 사람 프로필을 "읽기"만 가능 (동료 검색 · 닉네임 표시용)
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (auth.role() = 'authenticated');


-- ── 2) 동료 관계 ──────────────────────────────────────────
create table if not exists public.buddies (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references auth.users(id) on delete cascade,
  addressee  uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending',   -- pending | accepted
  created_at timestamptz default now(),
  unique (requester, addressee)
);
alter table public.buddies enable row level security;

-- 내가 걸린 관계만 보임
drop policy if exists buddies_see on public.buddies;
create policy buddies_see on public.buddies
  for select using (auth.uid() = requester or auth.uid() = addressee);

-- 요청은 내가 requester 일 때만 생성
drop policy if exists buddies_ins on public.buddies;
create policy buddies_ins on public.buddies
  for insert with check (auth.uid() = requester);

-- 승인은 받는 사람이, 취소·삭제는 양쪽 모두
drop policy if exists buddies_upd on public.buddies;
create policy buddies_upd on public.buddies
  for update using (auth.uid() = addressee or auth.uid() = requester);

drop policy if exists buddies_del on public.buddies;
create policy buddies_del on public.buddies
  for delete using (auth.uid() = requester or auth.uid() = addressee);


-- ── 3) 공유 일정 ──────────────────────────────────────────
create table if not exists public.shared_tasks (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  members    uuid[] not null default '{}',      -- 소유자 포함 참여자 목록
  data       jsonb not null,                    -- 일정 본문 (detail/start/end/done/cat/camp...)
  updated_at timestamptz default now(),
  updated_by uuid
);
alter table public.shared_tasks enable row level security;

-- 참여자만 조회 · 수정 가능
drop policy if exists shared_see on public.shared_tasks;
create policy shared_see on public.shared_tasks
  for select using (auth.uid() = owner or auth.uid() = any(members));

drop policy if exists shared_ins on public.shared_tasks;
create policy shared_ins on public.shared_tasks
  for insert with check (auth.uid() = owner);

drop policy if exists shared_upd on public.shared_tasks;
create policy shared_upd on public.shared_tasks
  for update using (auth.uid() = owner or auth.uid() = any(members));

drop policy if exists shared_del on public.shared_tasks;
create policy shared_del on public.shared_tasks
  for delete using (auth.uid() = owner);

create index if not exists shared_tasks_members_idx on public.shared_tasks using gin (members);


-- ── 4) 쪽지 ───────────────────────────────────────────────
create table if not exists public.notes_msg (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now(),
  read_at    timestamptz
);
alter table public.notes_msg enable row level security;

-- 주고받은 당사자만 조회
drop policy if exists msg_see on public.notes_msg;
create policy msg_see on public.notes_msg
  for select using (auth.uid() = from_user or auth.uid() = to_user);

-- 보내는 사람만 작성
drop policy if exists msg_ins on public.notes_msg;
create policy msg_ins on public.notes_msg
  for insert with check (auth.uid() = from_user);

-- 읽음 표시는 받는 사람이
drop policy if exists msg_upd on public.notes_msg;
create policy msg_upd on public.notes_msg
  for update using (auth.uid() = to_user);

create index if not exists notes_msg_pair_idx on public.notes_msg (from_user, to_user, created_at desc);


-- ── 5) 이메일로 동료 찾기 (RLS 우회 안전 함수) ──────────────
create or replace function public.find_user_by_email(p_email text)
returns table (user_id uuid, email text, nickname text)
language sql security definer set search_path = public as $$
  select p.user_id, p.email, p.nickname
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.find_user_by_email(text) to authenticated;


-- ═══════════════════════════════════════════════════════════
--  미니홈피 (상태메시지 · 배경음악 · 마이룸 · 방명록)
--  ※ 이미 collab.sql 을 실행하셨다면, 아래 부분만 추가로 실행하면 됩니다.
-- ═══════════════════════════════════════════════════════════

-- ── 프로필에 미니홈피 항목 추가 ──
alter table public.profiles add column if not exists status_msg text default '';
alter table public.profiles add column if not exists status_emo text default '😊';
alter table public.profiles add column if not exists bgm        text default '';
alter table public.profiles add column if not exists room       jsonb default '{}'::jsonb;

-- ── 방명록 ──
create table if not exists public.guestbook (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,  -- 미니홈피 주인
  author     uuid not null references auth.users(id) on delete cascade,  -- 글쓴이
  body       text not null,
  sticker    text default '',
  created_at timestamptz default now()
);
alter table public.guestbook enable row level security;

-- 로그인한 사람은 방명록을 읽을 수 있음 (미니홈피 방문)
drop policy if exists gb_see on public.guestbook;
create policy gb_see on public.guestbook
  for select using (auth.role() = 'authenticated');

-- 글은 본인 이름으로만 작성
drop policy if exists gb_ins on public.guestbook;
create policy gb_ins on public.guestbook
  for insert with check (auth.uid() = author);

-- 글쓴이 본인 또는 미니홈피 주인이 삭제 가능
drop policy if exists gb_del on public.guestbook;
create policy gb_del on public.guestbook
  for delete using (auth.uid() = author or auth.uid() = owner);

create index if not exists guestbook_owner_idx on public.guestbook (owner, created_at desc);


-- ── 방명록 답글 (홈피 주인이 한 줄 댓글) ──
alter table public.guestbook add column if not exists reply    text default '';
alter table public.guestbook add column if not exists reply_at timestamptz;

-- 답글은 미니홈피 주인만 작성/수정 가능
drop policy if exists gb_upd on public.guestbook;
create policy gb_upd on public.guestbook
  for update using (auth.uid() = owner) with check (auth.uid() = owner);


-- ── 미니홈피 추가 정보 (MBTI · 혈액형) ──
alter table public.profiles add column if not exists mbti      text default '';
alter table public.profiles add column if not exists blood     text default '';
alter table public.profiles add column if not exists info_open boolean default true;
