-- 마음 쉼터 실시간(함께 머무는 캐릭터 · 단체 대화 · 1:1 대화) — 2026-11-20
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 한 번 실행한다.
-- 전제: Authentication → Sign In / Providers → Anonymous sign-ins 켬 · Realtime → Settings → "Allow public access" 끔.
-- 메시지는 저장하지 않는다(Realtime Broadcast = 실시간 전달만). 저장하는 건 신고(space_reports)뿐.

-- 1) 공간 방 — 누가 있는지(presence) · 단체 대화 · 1:1 대화 초대(broadcast)
--    채널 이름: space:temple · space:church · space:cathedral · space:meditation
create policy "space rooms: receive"
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) in ('space:temple', 'space:church', 'space:cathedral', 'space:meditation')
  and realtime.messages.extension in ('broadcast', 'presence')
);

create policy "space rooms: send"
on realtime.messages for insert to authenticated
with check (
  (select realtime.topic()) in ('space:temple', 'space:church', 'space:cathedral', 'space:meditation')
  and realtime.messages.extension in ('broadcast', 'presence')
);

-- 2) 1:1 대화 — 채널 이름 dm:<방>:<작은 사용자 id>:<큰 사용자 id> · 그 두 사람만 듣고 보낼 수 있다
create policy "space dm: receive"
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) like 'dm:%'
  and (select auth.uid())::text in (
    split_part((select realtime.topic()), ':', 3),
    split_part((select realtime.topic()), ':', 4)
  )
  and realtime.messages.extension = 'broadcast'
);

create policy "space dm: send"
on realtime.messages for insert to authenticated
with check (
  (select realtime.topic()) like 'dm:%'
  and (select auth.uid())::text in (
    split_part((select realtime.topic()), ':', 3),
    split_part((select realtime.topic()), ':', 4)
  )
  and realtime.messages.extension = 'broadcast'
);

-- 3) 신고 — 앱은 넣기만 한다(읽기·고치기·지우기 없음). 운영자가 대시보드 Table Editor 에서 본다.
create table if not exists public.space_reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reporter uuid not null default auth.uid(),
  reported uuid not null,
  room text not null check (room in ('temple', 'church', 'cathedral', 'meditation')),
  reason text not null check (char_length(reason) <= 40),
  excerpt text check (char_length(excerpt) <= 300)
);
alter table public.space_reports enable row level security;
-- 새 표를 Data API 에 자동으로 열지 않게 만든 프로젝트라, 넣기 권한만 따로 준다(읽기·고치기·지우기 권한 없음).
grant insert (reported, room, reason, excerpt) on public.space_reports to authenticated;

create policy "space reports: insert own"
on public.space_reports for insert to authenticated
with check (reporter = (select auth.uid()));
