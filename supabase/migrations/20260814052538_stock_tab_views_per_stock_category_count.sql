begin;

-- 기업정보·차트·뉴스 방문 구간(opened_at/closed_at)은 더 이상 저장하지 않는다.
-- 프론트가 카테고리별 10초 이상 방문을 세어 종목당 최종 개수만 보낸다.
alter table public.stock_tab_views drop column duration_seconds;
alter table public.stock_tab_views drop column opened_at;
alter table public.stock_tab_views drop column closed_at;

alter table public.stock_tab_views
  add column stock_id integer not null references public.stocks(stock_id);
alter table public.stock_tab_views
  add column created_at timestamptz not null default now();

commit;
