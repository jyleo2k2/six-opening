begin;

-- 학교 시간 거래 제한. 부모가 켜고 같은 `family_tag` 의 자녀 계정에만 걸린다.
-- 가족 하나에 규칙 하나라 `family_tag` 가 그대로 기본키다. 가족이 없는 계정은
-- `user:<id>` 를 키로 쓴다(`app/api/trade-restriction/store.ts` 의 `restrictionKey`).
create table public.trade_restrictions (
  family_tag text not null,
  enabled boolean not null default false,
  -- 1=월 … 7=일 (ISO 8601). 빈 배열이면 어느 날도 걸리지 않는다.
  weekdays smallint[] not null default '{1,2,3,4,5}',
  -- 자정부터 흐른 분. 09:00 = 540, 15:00 = 900.
  start_minute smallint not null default 540,
  end_minute smallint not null default 900,
  block_buy boolean not null default true,
  block_sell boolean not null default true,
  updated_by bigint,
  updated_at timestamptz not null default now(),
  constraint trade_restrictions_pkey primary key (family_tag),
  constraint trade_restrictions_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null,
  -- 자정을 넘는 창은 만들지 않는다. 화면도 시작<종료 로만 저장을 보낸다.
  constraint trade_restrictions_window_check
    check (start_minute >= 0 and end_minute <= 1440 and start_minute < end_minute)
);

commit;
