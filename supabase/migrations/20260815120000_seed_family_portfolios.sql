-- 홈 화면 하단 보유종목을 Supabase 실데이터와 연동하기 위해, 찬영 가족 3계정의
-- 보유종목을 사용자가 지정한 포트폴리오로 교체한다.
--   김찬영(1, child)  집중투자: 크래프톤·하이브
--   찬영엄마(2, mom)  분산투자: LG생활건강·농심·키움증권·대한항공
--   찬영아빠(3, dad)  분산투자: 삼성전자·SK하이닉스·현대차·한화에어로스페이스·삼성중공업
--
-- 이전 holdings/transactions는 시드 스크립트와 수동 테스트 매매가 섞여 새 포트폴리오와
-- 맞지 않으므로(예: 한국항공우주 보유가 남아있는데 크래프톤·하이브 구성으로 바꿔야 함)
-- 세 계정분만 지우고 다시 채운다. 평단가는 2026-08-13~14 종가(stock_candles) 부근으로,
-- 매수 시각은 그보다 앞선 날짜로 흩어 자연스러운 매수 이력을 만든다.
-- 수량·평단가·매수 사유는 실제 사용자 데이터가 아니라 데모용으로 임의 구성한 값이다.

begin;

delete from public.trade_likes
  where transaction_id in (select id from public.transactions where user_id in (1, 2, 3));
delete from public.trade_comments
  where transaction_id in (select id from public.transactions where user_id in (1, 2, 3));
delete from public.transactions where user_id in (1, 2, 3);
delete from public.holdings where user_id in (1, 2, 3);

insert into public.holdings (user_id, stock_id, quantity, avg_price) values
  (1, 2,  23,  235000),  -- 김찬영: 크래프톤
  (1, 5,  20,  178000),  -- 김찬영: 하이브
  (2, 20, 6,   310000),  -- 찬영엄마: LG생활건강
  (2, 13, 4,   430000),  -- 찬영엄마: 농심
  (2, 34, 7,   295000),  -- 찬영엄마: 키움증권
  (2, 21, 50,  26000),   -- 찬영엄마: 대한항공
  (3, 7,  6,   270000),  -- 찬영아빠: 삼성전자
  (3, 40, 1,   1630000), -- 찬영아빠: SK하이닉스
  (3, 8,  3,   448000),  -- 찬영아빠: 현대차
  (3, 39, 1,   1120000), -- 찬영아빠: 한화에어로스페이스
  (3, 49, 100, 22000);   -- 찬영아빠: 삼성중공업

insert into public.transactions
  (user_id, stock_id, side, trade_price, trade_quantity, trade_reason, created_at) values
  (1, 2,  'buy', 235000,  23,  'buy_familiar', '2026-08-05 01:20:00+00'),
  (1, 5,  'buy', 178000,  20,  'buy_social',   '2026-08-07 05:40:00+00'),
  (2, 20, 'buy', 310000,  6,   'buy_familiar', '2026-08-06 00:50:00+00'),
  (2, 13, 'buy', 430000,  4,   'buy_familiar', '2026-08-08 02:10:00+00'),
  (2, 34, 'buy', 295000,  7,   'buy_news',     '2026-08-10 06:30:00+00'),
  (2, 21, 'buy', 26000,   50,  'buy_chart',    '2026-08-12 03:15:00+00'),
  (3, 7,  'buy', 270000,  6,   'buy_familiar', '2026-08-05 23:10:00+00'),
  (3, 40, 'buy', 1630000, 1,   'buy_news',     '2026-08-07 08:05:00+00'),
  (3, 8,  'buy', 448000,  3,   'buy_chart',    '2026-08-09 01:45:00+00'),
  (3, 39, 'buy', 1120000, 1,   'buy_ranking',  '2026-08-11 04:20:00+00'),
  (3, 49, 'buy', 22000,   100, 'buy_ranking',  '2026-08-13 07:00:00+00');

-- 계좌 잔액도 매수에 쓴 만큼 줄여 seed 잔액(10,000,000)과 앞뒤가 맞게 한다.
update public.account set balance = 1035000 where user_id = 1;
update public.account set balance = 3055000 where user_id = 2;
update public.account set balance = 2086000 where user_id = 3;

commit;
