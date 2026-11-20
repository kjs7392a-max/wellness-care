-- 마음 쉼터 「함께 머무는 사람」 — 내가 지은 이름(닉네임) · 2026-11-20
-- 사용자 지시: "내가 캐릭터 이름을 지을 수 있게 해서 계속 고유 캐릭터와 아이디를 가질 수 있게"
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 한 번 실행한다(docs/space-realtime-setup.sql 다음).
-- 저장하는 것: 사용자 id · 지은 이름 · 고른 캐릭터 · 바꾼 시각뿐. 🚫 메시지·실명·연락처는 저장하지 않는다.

create table if not exists public.space_profiles (
  uid uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nickname text not null,
  avatar text not null,
  updated_at timestamptz not null default now(),
  -- 한글·영문·숫자 2~10자(앱 checkNickname 과 같은 규칙)
  constraint space_profiles_nickname_shape check (nickname ~ '^[가-힣A-Za-z0-9]{2,10}$'),
  constraint space_profiles_avatar_known check (avatar in ('haneul', 'bada', 'saebyeok', 'noeul', 'sol', 'byeol', 'iseul', 'baram'))
);

-- 이름은 모두 통틀어 하나뿐(대소문자 구분 없이)
create unique index if not exists space_profiles_nickname_unique on public.space_profiles (lower(nickname));

-- 바꾼 시각은 서버가 적는다
create or replace function public.space_profiles_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists space_profiles_touch on public.space_profiles;
create trigger space_profiles_touch
before insert or update on public.space_profiles
for each row execute function public.space_profiles_touch();

alter table public.space_profiles enable row level security;

-- 같은 방 사람의 이름을 읽는다(로그인한 사람 · 익명 포함) — 이름·캐릭터뿐이라 공개해도 된다
drop policy if exists "space profiles: read" on public.space_profiles;
create policy "space profiles: read"
on public.space_profiles for select to authenticated
using (true);

-- 내 이름만 만들고 바꾼다
drop policy if exists "space profiles: insert own" on public.space_profiles;
create policy "space profiles: insert own"
on public.space_profiles for insert to authenticated
with check (uid = (select auth.uid()));

drop policy if exists "space profiles: update own" on public.space_profiles;
create policy "space profiles: update own"
on public.space_profiles for update to authenticated
using (uid = (select auth.uid()))
with check (uid = (select auth.uid()));

revoke all on public.space_profiles from anon, authenticated;
grant select on public.space_profiles to authenticated;
grant insert (uid, nickname, avatar), update (uid, nickname, avatar) on public.space_profiles to authenticated;
