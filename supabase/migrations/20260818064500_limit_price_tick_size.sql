-- 지정가 한도가격을 종목의 호가단위(최소 가격 변동폭)로 묶는다.
--
-- 화면(`shared/engine/tick-size.ts`)과 API(`POST /api/orders`)가 이미 같은 표를 보지만
-- 예약을 실제로 만드는 곳은 `reserve_order` 하나뿐이다. 여기서 막지 않으면 화면을 거치지
-- 않은 요청이 실거래에 없는 가격으로 예약을 남기고, 그 주문은 영영 닿지 않은 채 지갑만
-- 잠근다. F2 SPEC §6.3 "미체결 주문은 transactions 가 유일한 원본" 과 같은 이유다.

-- ── 1. 상장 시장 ────────────────────────────────────────────────────────────
--
-- 호가단위가 20만원부터 시장에 따라 갈리므로(KOSPI 500원 ↔ KOSDAQ 100원) 종목마다
-- 어느 시장인지 알아야 한다. 기본값 KOSPI 는 고가 구간에서 단위가 더 큰 쪽이라
-- 새 종목이 들어와도 더 깐깐하게 걸러지는 방향으로 틀린다.

alter table public.stocks
  add column if not exists market text not null default 'KOSPI';

alter table public.stocks
  drop constraint if exists stocks_market_check;

alter table public.stocks
  add constraint stocks_market_check check (market in ('KOSPI', 'KOSDAQ'));

-- 선정 51종목 중 KOSDAQ 은 셋뿐이다(에스엠·JYP·와이지). 나머지는 기본값 KOSPI 로 남는다.
update public.stocks
   set market = 'KOSDAQ'
 where stock_code in ('041510', '035900', '122870');

-- ── 2. 호가단위 표 ──────────────────────────────────────────────────────────
--
-- KRX 현행(2023-01-25 개정). `shared/engine/tick-size.ts` 와 같은 구간이어야 하며
-- 경계는 모두 "이상"이다 — 200,000원은 500원 단위이고 199,999원은 100원 단위다.
-- KOSDAQ 은 5만원 위로 100원 하나로 끝나 KOSPI 처럼 500·1,000 으로 올라가지 않는다.

create or replace function public.tick_size(p_price numeric, p_market text)
returns numeric
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_price is null or p_price < 2000 then 1
    when p_price < 5000 then 5
    when p_price < 20000 then 10
    when p_price < 50000 then 50
    when p_market = 'KOSDAQ' then 100
    when p_price < 200000 then 100
    when p_price < 500000 then 500
    else 1000
  end::numeric;
$$;

comment on function public.tick_size(numeric, text) is
  '국내주식 최소 호가단위(KRX 2023-01-25 개정). shared/engine/tick-size.ts 와 같은 표.';

-- ── 3. 접수 게이트 ──────────────────────────────────────────────────────────
--
-- 기존 본문 그대로이고 한도가격 검사만 바뀐다. 시장 구분을 알아야 판정할 수 있어
-- 종목 조회를 지정가 검사보다 앞으로 옮겼다.

create or replace function public.reserve_order(
  p_user_id bigint,
  p_stock_code text,
  p_side text,
  p_order_type text,
  p_limit_price numeric default null::numeric,
  p_reserved_amount numeric default null::numeric,
  p_request_mode text default null::text,
  p_requested_quantity numeric default null::numeric,
  p_scheduled_for date default null::date,
  p_reason text default null::text,
  p_plan_code text default null::text,
  p_plan_target_price numeric default null::numeric,
  p_memo text default null::text,
  p_plan_match boolean default null::boolean,
  p_plan_changed_reason text default null::text
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_stock_id integer;
  v_market   text;
  v_tick     numeric;
  v_balance  numeric;
  v_reserved numeric;
  v_qty      numeric;
  v_locked   numeric;
  v_status   text;
  v_price    numeric;
  v_tx_id    uuid;
begin
  if p_side not in ('buy', 'sell') then
    raise exception '알 수 없는 주문 방향입니다: %', p_side;
  end if;
  if p_order_type not in ('market', 'limit') then
    raise exception '알 수 없는 주문 유형입니다: %', p_order_type;
  end if;

  v_status := case when p_order_type = 'limit' then 'pending' else 'scheduled' end;
  if v_status = 'scheduled' and p_scheduled_for is null then
    raise exception '예약 시장가는 체결 예정일이 필요합니다.';
  end if;
  if p_order_type = 'limit' and (p_limit_price is null or p_limit_price <= 0) then
    raise exception '지정가는 한도가격이 필요합니다.';
  end if;

  select stock_id, market into v_stock_id, v_market
    from stocks where stock_code = p_stock_code;
  if v_stock_id is null then
    raise exception '등록되지 않은 종목입니다: %', p_stock_code;
  end if;

  -- 호가단위에 맞지 않는 값은 실거래에 없는 가격이다. 소수 한도가격도 여기서 걸린다.
  if p_order_type = 'limit' then
    v_tick := tick_size(p_limit_price, v_market);
    if p_limit_price <> trunc(p_limit_price) or mod(p_limit_price, v_tick) <> 0 then
      raise exception '지정가는 %원 단위로만 넣을 수 있습니다: %', v_tick, p_limit_price;
    end if;
  end if;

  insert into account (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance, reserved_balance into v_balance, v_reserved
    from account where user_id = p_user_id for update;

  if p_side = 'buy' then
    if p_reserved_amount is null or p_reserved_amount <= 0 then
      raise exception '예약 금액은 0보다 커야 합니다.';
    end if;
    if v_balance - v_reserved < p_reserved_amount then
      raise exception '잔액이 부족합니다.';
    end if;
    update account set reserved_balance = v_reserved + p_reserved_amount
      where user_id = p_user_id;
  else
    if p_requested_quantity is null or p_requested_quantity <= 0 then
      raise exception '예약 수량은 0보다 커야 합니다.';
    end if;
    select quantity, reserved_quantity into v_qty, v_locked
      from holdings where user_id = p_user_id and stock_id = v_stock_id for update;
    if coalesce(v_qty, 0) - coalesce(v_locked, 0) < p_requested_quantity then
      raise exception '보유 수량이 부족합니다.';
    end if;
    update holdings set reserved_quantity = coalesce(v_locked, 0) + p_requested_quantity,
                        updated_at = now()
      where user_id = p_user_id and stock_id = v_stock_id;
  end if;

  -- 접수 시점에 아는 가격은 지정가의 한도가격뿐이다. 예약 시장가는 다음 거래일 시가가
  -- 확정돼야 알 수 있으므로 비워 두고 settle_order 가 채운다.
  v_price := p_limit_price;

  insert into transactions
    (user_id, stock_id, side, trade_price, trade_quantity, trade_reason,
     plan_code, plan_target_price, memo, plan_match, plan_changed_reason,
     order_status, order_type, limit_price, scheduled_for,
     reserved_amount, request_mode, requested_quantity)
  values
    (p_user_id, v_stock_id, p_side, v_price, p_requested_quantity, p_reason,
     case when p_side = 'buy' then p_plan_code end,
     case when p_side = 'buy' then p_plan_target_price end,
     case when p_side = 'buy' then nullif(btrim(p_memo), '') end,
     case when p_side = 'sell' then p_plan_match end,
     case when p_side = 'sell' and p_plan_match is false then p_plan_changed_reason end,
     v_status, p_order_type, p_limit_price, case when v_status = 'scheduled' then p_scheduled_for end,
     case when p_side = 'buy' then p_reserved_amount end, p_request_mode, p_requested_quantity)
  returning id into v_tx_id;

  return json_build_object('order_id', v_tx_id, 'order_status', v_status);
end;
$$;
