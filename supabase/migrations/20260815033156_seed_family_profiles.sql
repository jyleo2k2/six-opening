-- 찬영 가족 세 계정을 저장소에서 재현 가능하게 만든다.
--
-- 지금까지 profiles 행은 Supabase 콘솔에서 손으로만 만들었다. 그래서
-- 20260814111455_add_profiles_guardian_role.sql 의 `update ... where login_id = 'dad'` 처럼
-- 행이 이미 있다고 전제하는 마이그레이션이 있는데도, 빈 DB 에 마이그레이션을 처음부터
-- 돌리면 계정이 0개가 되어 로그인 자체가 불가능했다.
--
-- 비밀번호는 커밋하지 않는다. profiles.login_password 는 아직 평문이라(로그인 route 주석 참고)
-- 실제 값을 저장소에 넣으면 그대로 자격증명 유출이다. 자리표시자로 넣고 배포 후 콘솔에서
-- 직접 바꾼다.
--
-- 라이브 DB 는 건드리지 않는다. 세 행이 이미 있으므로 on conflict do nothing 이 전부 걸린다.

begin;

insert into public.profiles (id, name, login_id, login_password, parent_child, family_tag, guardian_role)
values
  (1, '김찬영',   'cksdud', 'CHANGE_ME', 'child',  '찬영가족', null),
  (2, '찬영엄마', 'mom',    'CHANGE_ME', 'parent', '찬영가족', 'mom'),
  (3, '찬영아빠', 'dad',    'CHANGE_ME', 'parent', '찬영가족', 'dad')
on conflict (id) do nothing;

-- id 를 직접 넣었으므로 identity 시퀀스를 최대값 뒤로 밀어 둔다.
-- 이걸 빼면 다음 insert 가 id=1 을 다시 시도해 기본키 충돌로 죽는다.
select setval(
  pg_get_serial_sequence('public.profiles', 'id'),
  greatest((select max(id) from public.profiles), 1)
);

-- 계정 잔고 행도 함께 만든다. apply_trade 가 없으면 만들지만, 로그인 직후 조회가
-- 먼저 오는 경로에서는 잔고가 비어 보인다.
insert into public.account (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

commit;
