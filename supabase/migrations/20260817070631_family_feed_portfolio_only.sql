-- 가족 피드를 데모 포트폴리오와 맞춘다 — 문서 밖 잔여 거래 정리, 찬영아빠 최신 기록, 메모 보강.
--
-- `/api/family` 가 **아직 들고 있는 종목의 기록만** 피드로 내보내게 바뀌었다. 그 규칙만으로
-- 김찬영의 문서 밖 거래(오리온·대한항공·LG전자·SK스퀘어·삼성전자)는 보유가 0이라 저절로
-- 빠진다. **그래서 그 행들은 지우지 않는다** — 8/5~8/14 에 걸친 기록이라 지우면 지난 주차
-- 성향 카드가 함께 바뀐다.
--
-- 남는 문제는 찬영엄마의 삼성전자뿐이다. 오늘 주문 화면을 시험하며 생긴 거래 5건이고
-- 0.109주가 보유로 남아 있어 위 규칙을 통과한다. 전부 오늘(이번 주) 것이라 지워도 지난
-- 주차 카드에는 닿지 않는다. 계좌 잔액은 지우는 행의 현금 흐름을 되돌려 앞뒤를 맞춘다.
--
-- 찬영아빠는 가장 최근 기록이 8/14 라 최신 여섯 장에 한 장도 못 들었다. 오늘 자로 매도·매수
-- 한 건씩 넣어 세 사람이 고루 보이게 한다. 매도 종목은 **판 뒤에도 보유가 남는 것**으로
-- 골랐다 — 다 팔면 위 규칙에 걸려 그 카드가 스스로 사라진다.
--
-- 값은 보관 종가(`stock_candles` 2026-08-13)에 맞춘다. 차트 마커가 체결가를 y 로 쓰므로
-- 시세와 어긋나면 뱃지가 캔들에서 떨어진 곳에 뜬다.
--
-- 두 번 돌려도 같은 상태다. 잔액·보유는 새 거래가 아직 없을 때만 움직이고, 메모는
-- `coalesce` 라 이미 있는 글을 덮지 않는다.

begin;

-- ── 1. 찬영엄마의 문서 밖 삼성전자 정리 ─────────────────────────────────────
-- 잔액부터 되돌린다. 지운 뒤에는 얼마가 오갔는지 셀 수 없다.
update public.account a set balance = a.balance + (
  select coalesce(sum(
    case when t.side = 'buy' then t.trade_price * t.trade_quantity
         else -t.trade_price * t.trade_quantity end
  ), 0)
  from public.transactions t
  where t.user_id = 2 and t.stock_id = 7 and t.order_status = 'filled'
)
where a.user_id = 2;

delete from public.trade_likes
  where transaction_id in (select id from public.transactions where user_id = 2 and stock_id = 7);
delete from public.trade_comments
  where transaction_id in (select id from public.transactions where user_id = 2 and stock_id = 7);
delete from public.transactions where user_id = 2 and stock_id = 7;
delete from public.holdings where user_id = 2 and stock_id = 7;

-- ── 2. 찬영아빠 오늘 기록 ───────────────────────────────────────────────────
-- 잔액·보유를 먼저 옮긴다. 아래 insert 가 끝나면 `not exists` 가 거짓이 되어 두 번 걸리지 않는다.
update public.account set balance = balance + 274500 - 453000
where user_id = 3
  and not exists (select 1 from public.transactions where id = 'c9a10000-0000-4000-8000-000000000001');

-- 삼성전자 6주 중 1주만 판다. 5주가 남아야 이 카드가 피드에 남는다.
update public.holdings set quantity = quantity - 1
where user_id = 3 and stock_id = 7
  and not exists (select 1 from public.transactions where id = 'c9a10000-0000-4000-8000-000000000001');

-- 현대차는 한 주 더 담아 평단을 다시 낸다. `quantity` 오른쪽 값은 갱신 전 수량이다.
update public.holdings set
  avg_price = (avg_price * quantity + 453000) / (quantity + 1),
  quantity = quantity + 1
where user_id = 3 and stock_id = 8
  and not exists (select 1 from public.transactions where id = 'c9a10000-0000-4000-8000-000000000001');

insert into public.transactions
  (id, user_id, stock_id, side, trade_price, trade_quantity, trade_reason,
   plan_code, plan_target_price, plan_match, memo, order_status, order_type, created_at, filled_at)
values
  ('c9a10000-0000-4000-8000-000000000001', 3, 7, 'sell', 274500, 1, 'sell_target_hit',
   null, null, true, '처음 정해 둔 값에 와서 여섯 주 중 한 주만 덜어냈어. 나머지는 그대로 간다.',
   'filled', 'market', '2026-08-17 01:10:00+00', '2026-08-17 01:10:00+00'),
  ('c9a10000-0000-4000-8000-000000000002', 3, 8, 'buy', 453000, 1, 'buy_chart',
   'plan_target', 500000, null, '차가 잘 팔린다는 기사를 봤어. 그래프도 오래 눌렸다 올라오는 모양이더라.',
   'filled', 'market', '2026-08-17 04:20:00+00', '2026-08-17 04:20:00+00')
on conflict (id) do nothing;

-- ── 3. 남는 문서 종목 거래에 메모·계획 채우기 ───────────────────────────────
-- 계획이 비면 카드 오른쪽 판이 산 가격만 되풀이한다. 메모가 비면 본문이 이유 한 줄로 같아진다.
-- 이미 적힌 글은 덮지 않는다.
update public.transactions set
  memo = coalesce(memo, '형이 좋아하는 그룹이라 나도 관심이 생겼어.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = 'd4f52846-c27e-4750-8fc9-255c4462a155';

update public.transactions set
  memo = coalesce(memo, '처음으로 내 돈 주고 산 회사야. 떨리기도 하고 신기해.'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 260000)
where id = '4a0a7325-b0e9-42ed-ac2d-2b623fca13da';

update public.transactions set
  memo = coalesce(memo, '그래프가 오래 눌려 있길래 조금씩 나눠 담아 봤어.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = '890d2bbf-1f3a-4e4a-86fe-4991f72fded1';

update public.transactions set
  memo = coalesce(memo, '증권사 실적 기사를 봤어. 이번엔 이유를 적어 두고 산다.'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 320000)
where id = 'ec635162-24dc-4809-a998-a9e7ae0d43e5';

update public.transactions set
  memo = coalesce(memo, '라면은 우리 집 필수품이잖아. 아는 회사부터 시작하기로 했어.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = 'cc02f56f-393e-4948-b620-d3895452b23d';

update public.transactions set
  memo = coalesce(memo, '매일 쓰는 물건을 만드는 회사라 마음이 놓여.'),
  plan_code = coalesce(plan_code, 'plan_none')
where id = 'd7c10fb1-5d55-41d3-b5b6-3a774323fb01';

update public.transactions set
  memo = coalesce(memo, '인기 순위에서 계속 위에 있길래 한 주 더 보탰어.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = 'fbb1efd0-d3da-4135-a65a-a040a32152ac';

update public.transactions set
  memo = coalesce(memo, '조선 쪽이 오래 눌렸다가 움직이기 시작했더라.'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 25000)
where id = '42fc13b2-88dd-4397-95d9-4cdc51347600';

update public.transactions set
  memo = coalesce(memo, '방산 쪽을 한 번 담아 보고 싶었어. 우선 한 주만.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = '3fc52f32-edaa-4734-ac19-d40d500131c0';

update public.transactions set
  memo = coalesce(memo, '그래프가 바닥을 다진 것 같아서 들어가 봤어.'),
  plan_code = coalesce(plan_code, 'plan_target'),
  plan_target_price = coalesce(plan_target_price, 500000)
where id = '758d2d61-8071-4ac2-9975-9c26d12f8ec8';

update public.transactions set
  memo = coalesce(memo, '반도체 실적 기사를 보고 골랐어. 비싸지만 한 주만.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = 'a303b6bf-4104-4a03-9a3d-23f0702a707e';

update public.transactions set
  memo = coalesce(memo, '갤럭시를 오래 써서 사업이 눈에 그려져. 오래 들고 갈 생각이야.'),
  plan_code = coalesce(plan_code, 'plan_season')
where id = '382f5aef-079d-4ff6-8dee-e99cc0fdc971';

-- ── 4. 새 카드의 반응 ───────────────────────────────────────────────────────
-- 부모→자녀 댓글은 앱에서 `shared/engine/comment-filter.ts` 게이트를 지난다. SQL 은 그
-- 게이트를 우회하므로 같은 기준(종목 추천·매매 시점·훈계·성적 평가 금지)을 지켜 적는다.
insert into public.trade_comments (transaction_id, user_id, body)
select v.transaction_id::uuid, v.user_id, v.body
from (values
  ('c9a10000-0000-4000-8000-000000000001', 1, '아빠도 정해 둔 만큼 오면 파는 거예요?'),
  ('c9a10000-0000-4000-8000-000000000001', 2, '정한 만큼 왔을 때 덜어내는 게 제일 어렵지.'),
  ('c9a10000-0000-4000-8000-000000000002', 1, '아빠 차 만드는 회사도 주식이 있구나!')
) as v(transaction_id, user_id, body)
where exists (select 1 from public.transactions t where t.id = v.transaction_id::uuid)
  and not exists (
    select 1 from public.trade_comments c
    where c.transaction_id = v.transaction_id::uuid and c.user_id = v.user_id and c.body = v.body
  );

insert into public.trade_likes (transaction_id, user_id)
select v.transaction_id::uuid, v.user_id
from (values
  ('c9a10000-0000-4000-8000-000000000001', 1),
  ('c9a10000-0000-4000-8000-000000000002', 2),
  ('933c369a-cc8c-4d30-9c8c-8c1fae609716', 1)
) as v(transaction_id, user_id)
where exists (select 1 from public.transactions t where t.id = v.transaction_id::uuid)
  and not exists (
    select 1 from public.trade_likes l
    where l.transaction_id = v.transaction_id::uuid and l.user_id = v.user_id
  );

commit;
