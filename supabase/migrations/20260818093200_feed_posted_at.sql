begin;

-- 피드 카드의 시각을 **글을 쓴 때**로 바꾼다 (2026-08-18).
--
-- 카드 머리에 뜨던 `3일 전` 은 `transactions.created_at`, 즉 **체결 시각**이었다. 피드는
-- 2026-08-17 부터 체결과 분리돼서(`feed_body` 에 글을 써야 올라간다) 지난주에 산 종목을
-- 오늘 올릴 수 있는데, 그러면 방금 쓴 글이 `5일 전` 으로 떴다. 언제 산 것인지는 카드 안
-- 날짜 라벨(`8월 13일 매수`)이 따로 말하므로, 머리의 시각은 글을 올린 때여야 한다.
--
-- 체결 시각은 그대로 둔다. 성향·수익률·차트 마커는 계속 `created_at` 을 읽는다.

alter table public.transactions
  add column if not exists feed_posted_at timestamptz;

comment on column public.transactions.feed_posted_at is
  '가족 피드에 글을 올린 시각. feed_body 와 짝이며 피드에서 내리면 함께 비운다.';

-- 이미 올라가 있는 글은 올린 시각을 알 길이 없어 체결 시각으로 채운다. 비워 두면 그 행들만
-- 피드 정렬(`feed_posted_at desc`)에서 자리가 흔들린다.
update public.transactions
   set feed_posted_at = created_at
 where feed_body is not null
   and feed_posted_at is null;

-- 피드 조회는 늘 `feed_body is not null` 을 함께 걸므로 부분 인덱스로 충분하다.
create index if not exists idx_transactions_feed_posted_at
    on public.transactions (feed_posted_at desc)
 where feed_body is not null;

commit;
