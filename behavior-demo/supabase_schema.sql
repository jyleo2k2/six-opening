-- ============================================================
-- 행동 데이터 수집 데모 — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 핵심 질문: "종목 이름만 보고 매수하나, 정보 탭을 열어보고 매수하나"
--   → 상세화면 3개 섹션(차트 / 기업정보 / 관련뉴스)의 '상세보기' 클릭을
--     종목별로 남기고, 같은 종목의 매수/패스 결정과 짝지어 저장한다.
-- ============================================================

-- 1) 원본 이벤트 (데모용: 실서비스에선 보관기간 짧게 두거나 생략)
create table if not exists behavior_events (
  id          bigserial primary key,
  session_id  uuid        not null,
  user_key    text        not null,          -- 익명 디바이스 키 (개인정보 아님)
  ts          bigint      not null,          -- 세션 시작 기준 경과 ms
  -- swipe | scroll | tap | dwell | card_view | detail_open
  -- | section_open | section_close | decision
  type        text        not null,
  screen      text,                          -- deck | detail
  ticker      text,                          -- 어느 종목 카드에서 발생했는지
  -- 어느 UI 덩어리에서 났는지. 좌표 추정이 아니라 DOM 의 data-section 값 그대로.
  --   chart | company | news | header | action | card | other
  section     text,
  choice      text,                          -- decision 일 때: buy | pass
  -- 좌표는 화면 크기로 정규화된 0~1 값 (기기 해상도 무관하게 비교 가능)
  x           real,
  y           real,
  -- 제스처 부가 정보
  direction   text,                          -- left | right | up | down
  velocity    real,                          -- px/ms
  duration_ms integer,                       -- 제스처/체류/섹션 열람 시간
  depth       real,                          -- 스크롤 도달 비율 0~1
  -- section_open: {order}
  -- decision:     {source, sections_opened, sections_list, informed}
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_events_session on behavior_events (session_id);
create index if not exists idx_events_type    on behavior_events (type);
create index if not exists idx_events_section on behavior_events (section);

-- 2) 세션 집계 (스코어링은 이 테이블 기준)
create table if not exists session_summary (
  session_id        uuid primary key,
  user_key          text not null,
  started_at        timestamptz not null,
  ended_at          timestamptz not null,
  duration_ms       integer not null,

  -- 스와이프
  cards_viewed      integer not null default 0,
  swipe_right       integer not null default 0,   -- 관심
  swipe_left        integer not null default 0,   -- 패스
  avg_swipe_ms      real,                          -- 카드 하나당 평균 판단 시간
  median_swipe_ms   real,
  avg_swipe_vel     real,                          -- 평균 스와이프 속도

  -- 스크롤 (상세 읽기 깊이)
  detail_opens      integer not null default 0,
  avg_scroll_depth  real,                          -- 평균 도달 비율 0~1
  max_scroll_depth  real,
  read_ms_total     integer not null default 0,

  -- 정보 섹션(상세보기 탭) 열람
  section_opens     jsonb,                         -- {"chart":3,"company":1,"news":0}
  section_dwell_ms  jsonb,                         -- 섹션별 펼쳐둔 총 시간 (ms)
  section_tickers   jsonb,                         -- 섹션별 열어본 종목 수
  first_section     text,                          -- 제일 먼저 여는 섹션
  top_section       text,                          -- 제일 오래 본 섹션

  -- 결정 ↔ 정보 노출  (이 데모의 결론 지표)
  decisions_total   integer not null default 0,
  buys_total        integer not null default 0,
  passes_total      integer not null default 0,
  buys_name_only    integer not null default 0,    -- 섹션 0개 연 채로 매수
  buys_informed     integer not null default 0,    -- 1개 이상 열고 매수
  name_only_buy_rate  real,                        -- buys_name_only / buys_total
  informed_buy_rate   real,
  avg_sections_before_buy real,                    -- 매수 전 평균 열람 섹션 수 (0~3)
  info_use_rate     real,                          -- 전체 결정 중 정보 열람 비율

  -- 히트맵: 원본 좌표 대신 4x6 그리드 밀도로 압축 저장
  grid_density      jsonb,                         -- [[..6개..] x 4행] 정규화 밀도
  section_share     jsonb,                         -- {"chart":0.42,"news":0.1,...} 탭 위치 비율
  taps_total        integer not null default 0,

  -- 파생 지표
  exploration_index real,                          -- 탐색도: 느린 판단 + 깊은 읽기
  behavior_type     text,                          -- 즉단형 | 탐색형 | 신중형 | 산만형
  decision_style    text,                          -- 이름형 | 정보형 | 혼합형

  created_at        timestamptz not null default now()
);

-- 이미 옛 스키마로 만들어 둔 프로젝트에서도 그대로 Run 되도록 보강
alter table behavior_events add column if not exists section text;
alter table behavior_events add column if not exists choice  text;
alter table behavior_events add column if not exists meta    jsonb;

alter table session_summary add column if not exists section_opens     jsonb;
alter table session_summary add column if not exists section_dwell_ms  jsonb;
alter table session_summary add column if not exists section_tickers   jsonb;
alter table session_summary add column if not exists first_section     text;
alter table session_summary add column if not exists top_section       text;
alter table session_summary add column if not exists decisions_total   integer not null default 0;
alter table session_summary add column if not exists buys_total        integer not null default 0;
alter table session_summary add column if not exists passes_total      integer not null default 0;
alter table session_summary add column if not exists buys_name_only    integer not null default 0;
alter table session_summary add column if not exists buys_informed     integer not null default 0;
alter table session_summary add column if not exists name_only_buy_rate real;
alter table session_summary add column if not exists informed_buy_rate  real;
alter table session_summary add column if not exists avg_sections_before_buy real;
alter table session_summary add column if not exists info_use_rate     real;
alter table session_summary add column if not exists section_share     jsonb;
alter table session_summary add column if not exists decision_style    text;

-- 확신도(confidence_index)는 더 이상 저장하지 않는다. 옛 스키마에 남아 있으면 지운다.
alter table session_summary drop column if exists confidence_index;

-- 3) RLS — 데모는 익명 insert 허용 (실서비스에선 auth.uid() 기준으로 조이기)
alter table behavior_events  enable row level security;
alter table session_summary  enable row level security;

drop policy if exists demo_insert_events on behavior_events;
create policy demo_insert_events on behavior_events
  for insert to anon with check (true);

drop policy if exists demo_read_events on behavior_events;
create policy demo_read_events on behavior_events
  for select to anon using (true);

drop policy if exists demo_insert_summary on session_summary;
create policy demo_insert_summary on session_summary
  for insert to anon with check (true);

drop policy if exists demo_read_summary on session_summary;
create policy demo_read_summary on session_summary
  for select to anon using (true);

-- ============================================================
-- 4) 분석용 뷰 — "이름만 보고 사는 사람" 을 바로 뽑아본다
-- ============================================================

-- 세션 단위 요약
create or replace view v_buy_basis as
select
  session_id,
  user_key,
  started_at,
  buys_total,
  buys_name_only,
  buys_informed,
  name_only_buy_rate,
  avg_sections_before_buy,
  first_section,
  top_section,
  decision_style,
  behavior_type
from session_summary
where buys_total > 0
order by started_at desc;

-- 종목 단위: 이 종목은 정보 없이 사지는가
create or replace view v_ticker_impulse as
select
  ticker,
  count(*)                                                   as decisions,
  count(*) filter (where choice = 'buy')                     as buys,
  count(*) filter (where choice = 'buy'
    and coalesce((meta->>'sections_opened')::int, 0) = 0)    as name_only_buys,
  round(avg(coalesce((meta->>'sections_opened')::numeric, 0)), 2) as avg_sections
from behavior_events
where type = 'decision'
group by ticker
order by name_only_buys desc;

-- 섹션 인기도: 어느 정보 탭을 제일 많이 여는가
create or replace view v_section_demand as
select
  section,
  count(*)                                as opens,
  count(distinct ticker)                  as tickers,
  count(distinct session_id)              as sessions
from behavior_events
where type = 'section_open'
group by section
order by opens desc;
