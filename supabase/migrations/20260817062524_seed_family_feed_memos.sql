-- 가족 피드에 실제로 읽을 것이 있게 만든다 — 메모·보유 계획·댓글·좋아요 시드.
--
-- 아카이브 수익률 탭의 피드 카드는 `transactions.memo` 와 `plan_code` 를 본문·오른쪽 판에
-- 편다. 그런데 라이브의 가족 거래 36건 중 메모가 있는 건 1건뿐이라, 카드가 전부
-- "내가 아는 회사라서 결정했어." 같은 이유 문구 한 줄로 똑같아 보였다. 댓글도 DB 전체에
-- 3건뿐이어서 반응 영역이 늘 비어 있었다. 데모에서 보여 줄 화면이 아니었다.
--
-- 문체는 `성장 아카이브 (오프라인).html` 시안의 피드를 따른다 — 아이는 자기 말로 짧게,
-- 부모는 계획과 감정을 함께 적는다. 종목은 라이브에 이미 있는 것을 그대로 쓴다.
--
-- **덮어쓰지 않는다.** memo 는 `memo is null` 인 행에만 넣는다. 다른 세션이 화면에서
-- 직접 남긴 기록(예: 찬영엄마의 "갤럭시 좋아")을 시드가 지우면 안 된다. 같은 이유로
-- 댓글·좋아요도 `not exists` 로 막아 두 번 돌려도 늘지 않는다.
--
-- **빈 DB 에서도 조용히 성공해야 한다**(README "새 환경에서 도는지가 판단 기준이다").
-- 여기 적힌 거래 id 는 라이브의 것이므로 새 환경에서는 어느 update 도 걸리지 않고,
-- 댓글·좋아요 insert 도 `where exists` 에서 0행이 되어 아무 일도 하지 않는다.

begin;

-- ── 김찬영(1) 매수·매도 ────────────────────────────────────────────────────
-- 계획(plan_code)까지 함께 넣는다. 카드 오른쪽 판이 `목표 금액`·`가지고 갈 기간` 을
-- 그 값으로 채우는데, 지금은 계획이 비어 있어 판이 산 가격만 반복하고 있었다.

update public.transactions set
  memo = coalesce(memo, '배그 만든 회사잖아! 내가 제일 잘 아는 게임이라 자신 있게 골랐어.'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 260000)
where id = 'b9a10000-0000-4000-8000-000000000020';

update public.transactions set
  memo = coalesce(memo, '차트 보다가 지금이다 싶었어. 느낌으로 고른 건 맞지만 후회는 안 해!'),
  plan_code = coalesce(plan_code, 'plan_short')
where id = 'b9a10000-0000-4000-8000-000000000019';

update public.transactions set
  memo = coalesce(memo, '어제보다 떨어졌길래 하나 더 담았어. 쌀 때 사는 거 맞지?'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = 'b9a10000-0000-4000-8000-000000000018';

update public.transactions set
  memo = coalesce(memo, '친구가 새 앨범 나온다고 알려줬어. 콘서트도 곧 한대!'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 200000)
where id = 'b9a10000-0000-4000-8000-000000000017';

update public.transactions set
  memo = coalesce(memo, '게임 대회 보다가 또 사고 싶어졌어. 이번엔 조금만 담았어.'),
  plan_code = coalesce(plan_code, 'plan_none')
where id = 'b9a10000-0000-4000-8000-000000000016';

-- 매도에는 계획을 지켰는지와 바꾼 이유가 붙는다 (F2 SPEC §7.1).
update public.transactions set
  memo = coalesce(memo, '더 좋아 보이는 회사를 찾아서 여기는 정리했어. 아쉽지만 다음이 있으니까!'),
  plan_match = coalesce(plan_match, false),
  plan_changed_reason = coalesce(plan_changed_reason, 'change_alternative')
where id = 'b9a10000-0000-4000-8000-000000000015';

-- ── 찬영엄마(2) 매수·매도 ──────────────────────────────────────────────────
update public.transactions set
  memo = coalesce(memo, '처음 정한 만큼 올라서 계획대로 절반만 정리했어. 욕심 안 내기로 했잖아.'),
  plan_match = coalesce(plan_match, true)
where id = 'a26ddd43-a22a-4c47-9c6c-e1ebae13dc4c';

update public.transactions set
  memo = coalesce(memo, '장 분위기가 좋아 보여서 이번 주만 짧게 들고 가 볼게.')
where id = '1904c094-76be-46ad-96e1-cd38e7ba82ec';

update public.transactions set
  memo = coalesce(memo, '확신까지는 아니야. 그래서 시즌 끝까지 천천히 지켜보려고 해.')
where id = 'c93fee6a-0702-447a-8a75-0a137bb4b8c1';

update public.transactions set
  memo = coalesce(memo, '여행 수요 소식 보고 담았던 건데, 정해 둔 만큼 와서 정리했어.'),
  plan_match = coalesce(plan_match, true)
where id = '933c369a-cc8c-4d30-9c8c-8c1fae609716';

update public.transactions set
  memo = coalesce(memo, '그래프가 바닥을 다진 것처럼 보였어. 시즌 끝까지 들고 가 보려고.')
where id = 'e0ecaf80-9a6a-4cdf-9930-fd6a4cd9bf92';

-- ── 댓글 ───────────────────────────────────────────────────────────────────
-- 부모→자녀 댓글은 앱에서 `shared/engine/comment-filter.ts` 게이트를 지난다. SQL 은 그
-- 게이트를 우회하므로 여기 문구도 같은 기준(종목 추천·매매 시점·훈계·성적 평가 금지)을
-- 지켜서 적는다.
insert into public.trade_comments (transaction_id, user_id, body)
select v.transaction_id::uuid, v.user_id, v.body
from (values
  ('b9a10000-0000-4000-8000-000000000020', 3, '크래프톤 고른 이유 저녁에 자세히 들려줘!'),
  ('b9a10000-0000-4000-8000-000000000020', 1, '게임 잘 되면 회사도 잘 되는 거 맞죠?'),
  ('b9a10000-0000-4000-8000-000000000015', 2, '정리한 이유를 스스로 설명할 수 있는 게 멋있어.'),
  ('a26ddd43-a22a-4c47-9c6c-e1ebae13dc4c', 1, '엄마 계획대로 팔았네요! 저도 따라 해 볼래요'),
  ('933c369a-cc8c-4d30-9c8c-8c1fae609716', 3, '정해 둔 걸 지키는 게 제일 어려운데 대단해.')
) as v(transaction_id, user_id, body)
where exists (select 1 from public.transactions t where t.id = v.transaction_id::uuid)
  and not exists (
    select 1 from public.trade_comments c
    where c.transaction_id = v.transaction_id::uuid and c.user_id = v.user_id and c.body = v.body
  );

-- ── 좋아요 ─────────────────────────────────────────────────────────────────
insert into public.trade_likes (transaction_id, user_id)
select v.transaction_id::uuid, v.user_id
from (values
  ('b9a10000-0000-4000-8000-000000000020', 2),
  ('b9a10000-0000-4000-8000-000000000020', 3),
  ('b9a10000-0000-4000-8000-000000000015', 2),
  ('a26ddd43-a22a-4c47-9c6c-e1ebae13dc4c', 1)
) as v(transaction_id, user_id)
where exists (select 1 from public.transactions t where t.id = v.transaction_id::uuid)
  and not exists (
    select 1 from public.trade_likes l
    where l.transaction_id = v.transaction_id::uuid and l.user_id = v.user_id
  );

commit;
