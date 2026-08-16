begin;

-- 관심 종목은 프로토타입 시절부터 `kw_proto_v1.watchlist` 에만 있었다. 계정에 붙는 값인데
-- 브라우저에 붙어 있어서, 다른 기기로 로그인하면 하트가 전부 풀리고 탐색의 관심 기업
-- 필터도 같이 빈다. 서버를 유일 원본으로 옮긴다.
create table public.watchlist (
  id bigint generated always as identity,
  user_id bigint not null,
  stock_id integer not null,
  created_at timestamptz not null default now(),
  constraint watchlist_pkey primary key (id),
  -- 같은 종목을 두 번 담을 수 없다. 토글이 중복 insert 를 내도 여기서 최종적으로 막힌다
  -- (`trade_likes` 와 같은 방식이다).
  constraint watchlist_user_id_stock_id_key unique (user_id, stock_id),
  constraint watchlist_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade,
  constraint watchlist_stock_id_fkey foreign key (stock_id) references public.stocks (stock_id) on delete cascade
);

-- 조회는 언제나 "내 관심 종목 전부"라 사용자 단위 인덱스 하나면 된다.
create index watchlist_user_idx on public.watchlist using btree (user_id);

commit;
