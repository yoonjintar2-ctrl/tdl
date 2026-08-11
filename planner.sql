-- ═══════════════════════════════════════════════════════════════
--  TDL 플래너 : 사용자별 데이터 테이블
--  Supabase 대시보드 → SQL Editor 에 그대로 붙여넣고 RUN
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.planner (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 행 수준 보안 : 본인 데이터만 읽고 쓸 수 있음
alter table public.planner enable row level security;

drop policy if exists planner_select_own on public.planner;
drop policy if exists planner_insert_own on public.planner;
drop policy if exists planner_update_own on public.planner;
drop policy if exists planner_delete_own on public.planner;

create policy planner_select_own on public.planner
  for select using (auth.uid() = user_id);

create policy planner_insert_own on public.planner
  for insert with check (auth.uid() = user_id);

create policy planner_update_own on public.planner
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy planner_delete_own on public.planner
  for delete using (auth.uid() = user_id);
