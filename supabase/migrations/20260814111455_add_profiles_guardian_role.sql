-- profiles.parent_child(parent/child)는 댓글 훈계 게이트·피드 접근·계정 전환 등 여러 곳에서
-- 권한 판단으로 쓰이므로 그대로 두고, 엄마/아빠 구분은 새 guardian_role 컬럼으로 분리한다.
-- 홈 화면 계정별 개인화(아빠=신발, 엄마=향수, 아이=왁뿌볼)에서만 사용한다.
alter table public.profiles
  add column guardian_role text;

alter table public.profiles
  add constraint profiles_guardian_role_check
  check (guardian_role is null or guardian_role = any (array['mom'::text, 'dad'::text]));

-- profiles_set_updated_at 트리거가 존재하는 updated_at 컬럼이 없어 UPDATE 자체가 막혀 있어서 함께 추가한다.
alter table public.profiles
  add column updated_at timestamptz not null default now();

update public.profiles set guardian_role = 'mom' where login_id = 'mom';
update public.profiles set guardian_role = 'dad' where login_id = 'dad';
