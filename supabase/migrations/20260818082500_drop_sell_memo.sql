begin;

-- 매도 완료 화면의 한 줄 메모를 걷어낸다 (2026-08-18).
--
-- `20260817000000_sell_memo_server_owned.sql` 이 이 메모를 서버 소유로 옮겼지만, 정작
-- 다시 읽는 자리가 없었다. 매도 회고 카드(`그때 한 말`)는 **매수** 메모만 보고, 가족 피드
-- 본문은 `feed_body` 가 원본이라 `GET /api/family` 가 `feed_body is not null` 로 거르고
-- 나간다. 즉 매도 메모는 적는 자리만 있고 보이는 자리가 없었다 — 화면에서 입력을 없애는
-- 김에 저장된 값과 저장 경로도 함께 지운다.
--
-- `transactions.memo` 컬럼 자체는 남긴다. 매수 메모가 같은 칸을 쓰고 그쪽은 유지한다.

update public.transactions
   set memo = null
 where side = 'sell'
   and memo is not null;

-- 매도 메모만 쓰던 갱신 함수. 매수 메모는 `apply_trade`·`reserve_order` 가 체결과 한
-- 트랜잭션에서 넣으므로 이 함수 없이도 그대로 동작한다.
drop function if exists public.set_trade_memo(bigint, uuid, text);

commit;
