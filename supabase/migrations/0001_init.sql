-- QR 코드 생성기 초기 스키마
--
-- 보안 원칙
--  1. 모든 사용자 데이터 테이블은 RLS를 켜고, 정책은 auth.uid() 기준 본인 행으로만 제한한다.
--  2. security definer 함수는 반드시 search_path를 비워 스키마 하이재킹을 막는다.
--  3. 클라이언트는 publishable(anon) 키만 쓰므로, 접근 통제는 전부 아래 정책이 책임진다.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: auth.users 1:1 확장 (표시 이름)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- INSERT 정책은 일부러 만들지 않는다. 프로필 생성은 아래 트리거만 수행한다.

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 회원가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 50), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 트리거 전용 함수다. PostgREST가 /rest/v1/rpc/handle_new_user 로 노출하지 않도록
-- EXECUTE 권한을 회수한다. 트리거 실행은 생성 시점에 권한을 확인하므로 영향이 없다.
revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거가 붙기 전에 만들어졌거나, 어떤 이유로든 프로필이 없는 계정을 메운다.
-- on conflict 로 멱등하므로 재실행해도 안전하다.
insert into public.profiles (id, display_name)
select u.id, nullif(left(coalesce(u.raw_user_meta_data ->> 'display_name', ''), 50), '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- qr_codes: 사용자별 QR 생성 기록
-- ---------------------------------------------------------------------------
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 80),
  kind text not null check (kind in ('url', 'text', 'email', 'phone', 'sms', 'wifi', 'vcard')),
  content text not null check (char_length(content) between 1 and 2048),
  -- 폼 입력값 원본(복원용). 크기 상한을 둬서 JSON 폭탄을 막는다.
  fields jsonb not null default '{}'::jsonb check (pg_column_size(fields) <= 8192),
  options jsonb not null default '{}'::jsonb check (pg_column_size(options) <= 2048),
  logo_path text check (logo_path is null or char_length(logo_path) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_codes_user_created_idx
  on public.qr_codes (user_id, created_at desc);

alter table public.qr_codes enable row level security;

drop policy if exists "qr_codes_select_own" on public.qr_codes;
create policy "qr_codes_select_own"
  on public.qr_codes for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "qr_codes_insert_own" on public.qr_codes;
create policy "qr_codes_insert_own"
  on public.qr_codes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "qr_codes_update_own" on public.qr_codes;
create policy "qr_codes_update_own"
  on public.qr_codes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "qr_codes_delete_own" on public.qr_codes;
create policy "qr_codes_delete_own"
  on public.qr_codes for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists qr_codes_set_updated_at on public.qr_codes;
create trigger qr_codes_set_updated_at
  before update on public.qr_codes
  for each row execute function public.set_updated_at();

-- 계정당 저장 개수 상한. 무한 저장으로 인한 자원 남용을 막는다.
create or replace function public.enforce_qr_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing integer;
begin
  select count(*) into existing from public.qr_codes where user_id = new.user_id;
  if existing >= 300 then
    raise exception '저장할 수 있는 QR 코드는 최대 300개입니다.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- 위와 같은 이유로 트리거 전용 함수의 EXECUTE 권한을 회수한다.
revoke execute on function public.enforce_qr_quota() from public, anon, authenticated, service_role;

drop trigger if exists qr_codes_enforce_quota on public.qr_codes;
create trigger qr_codes_enforce_quota
  before insert on public.qr_codes
  for each row execute function public.enforce_qr_quota();

-- ---------------------------------------------------------------------------
-- Storage: QR 가운데 삽입하는 로고 이미지 (비공개 버킷)
-- 경로 규칙: <user_id>/<uuid>.<ext>  → 첫 폴더가 소유자 판별 기준
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'qr-logos',
  'qr-logos',
  false,
  524288, -- 512KB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "qr_logos_select_own" on storage.objects;
create policy "qr_logos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'qr-logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "qr_logos_insert_own" on storage.objects;
create policy "qr_logos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qr-logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "qr_logos_delete_own" on storage.objects;
create policy "qr_logos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'qr-logos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
