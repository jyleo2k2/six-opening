-- 주문 생애주기를 DB 가 소유하게 만든다.
--
-- 지금까지 transactions 는 "체결된 거래"만 담았고, 지정가 대기(pending)와 장외 시장가
-- 예약(scheduled)은 localStorage(kw_proto_v1)에만 있었다. 그래서 브라우저를 지우면 예약이
-- 사라지고, 예약이 잡아 둔 현금·수량을 서버는 전혀 몰랐다.
--
-- 상태 다섯 개는 화면(app.html)이 이미 쓰던 값을 그대로 옮긴 것이다:
--   filled · pending(지정가 대기) · scheduled(다음 거래일 시가) · cancelled · rejected
--
-- 예약 자원은 "총량 - 잠긴 양 = 사용 가능"으로 잡는다.
--   현금: account.balance(총 현금) - account.reserved_balance(잠긴 현금)
--   수량: holdings.quantity(총 보유) - holdings.reserved_quantity(잠긴 보유)
-- 이렇게 두면 예약·취소가 총자산을 바꾸지 않는다 (F2 SPEC 의 "취소 시 자산 총액 불변").
-- balance 를 직접 깎는 방식은 취소 환불을 한 번 빠뜨리면 돈이 사라져서 쓰지 않는다.
--
-- 기존 행은 전부 체결분이므로 order_status 기본값 'filled' 로 그대로 유효하다. 다만 이제
-- transactions 에 미체결 행이 섞이므로 **거래를 읽는 모든 경로는 order_status = 'filled'
-- 을 걸러야 한다.** 이 마이그레이션과 같은 PR 에서 API 쪽을 함께 고친다.

begin;

-- ── 1. 주문 생애주기 컬럼 ────────────────────────────────────────────────────

alter table public.transactions
  add column order_status text not null default 'filled',
  add column order_type text not null default 'market',
  add column limit_price numeric,
  add column scheduled_for date,
  -- 예약이 잡아 둔 현금(매수) — 체결가가 예약 시점과 달라도 이 금액을 넘겨 쓰지 않는다.
  add column reserved_amount numeric,
  -- 'amount' = 금액 주문(체결가로 소수 수량 환산), 'quantity' = 주 수 주문
  add column request_mode text,
  add column requested_quantity numeric,
  add column filled_at timestamptz,
  add column cancelled_at timestamptz,
  add column rejected_at timestamptz,
  add column rejection_reason text;

alter table public.transactions
  add constraint transactions_order_status_check
  check (order_status = any (array[
    'filled'::text, 'pending'::text, 'scheduled'::text, 'cancelled'::text, 'rejected'::text
  ]));

alter table public.transactions
  add constraint transactions_order_type_check
  check (order_type = any (array['market'::text, 'limit'::text]));

alter table public.transactions
  add constraint transactions_request_mode_check
  check (request_mode is null or request_mode = any (array['amount'::text, 'quantity'::text]));

alter table public.transactions
  add constraint transactions_limit_price_check
  check (limit_price is null or limit_price > 0);

alter table public.transactions
  add constraint transactions_reserved_amount_check
  check (reserved_amount is null or reserved_amount > 0);

-- 지정가는 한도가격이 있어야 하고, 시장가는 없어야 한다.
alter table public.transactions
  add constraint transactions_limit_requires_price_check
  check ((order_type = 'limit') = (limit_price is not null));

-- 예약 상태는 잠근 금액 또는 수량을 반드시 남긴다. 없으면 해제할 근거가 사라진다.
alter table public.transactions
  add constraint transactions_reservation_backing_check
  check (
    order_status not in ('pending', 'scheduled')
    or (side = 'buy'  and reserved_amount is not null)
    or (side = 'sell' and requested_quantity is not null and requested_quantity > 0)
  );

-- 미체결 주문에는 체결가·체결수량이 아직 없다. 예약 시장가 매도처럼 접수 시점에 가격을 알 수
-- 없는 주문이 실제로 있으므로, 임시값을 지어 넣는 대신 not null 을 푼다. 대신 체결된 행은
-- 반드시 둘 다 갖도록 제약으로 막는다 — 거래를 읽는 쪽은 order_status='filled' 만 보므로
-- null 을 만나지 않는다.
alter table public.transactions
  alter column trade_price drop not null,
  alter column trade_quantity drop not null;

alter table public.transactions
  add constraint transactions_filled_requires_fill_check
  check (
    order_status <> 'filled'
    or (trade_price is not null and trade_price > 0
        and trade_quantity is not null and trade_quantity > 0)
  );

-- 기존 행은 모두 즉시 체결분이다. 체결 시각을 생성 시각으로 채운다.
update public.transactions
  set filled_at = created_at
  where order_status = 'filled' and filled_at is null;

-- 미체결 주문만 훑는 조회(예약 정산 배치, 주문 목록)를 위한 부분 인덱스.
create index idx_transactions_open_orders
  on public.transactions using btree (user_id, scheduled_for)
  where order_status in ('pending', 'scheduled');

-- ── 2. 예약 자원 ────────────────────────────────────────────────────────────

alter table public.account
  add column reserved_balance numeric not null default 0;

alter table public.account
  add constraint account_reserved_balance_check
  check (reserved_balance >= 0 and reserved_balance <= balance);

alter table public.holdings
  add column reserved_quantity numeric not null default 0;

alter table public.holdings
  add constraint holdings_reserved_quantity_check
  check (reserved_quantity >= 0 and reserved_quantity <= quantity);

-- ── 3. 즉시 체결 — apply_trade ──────────────────────────────────────────────
--
-- 시그니처는 그대로 둔다(호출부 app/api/trade/route.ts 무변경). 달라지는 것은 두 가지다.
--   1) 잔액·수량 검사를 총량이 아니라 **사용 가능량**으로 한다. 예약이 잡아 둔 몫을
--      즉시 주문이 다시 쓰면 예약을 체결할 수 없게 되기 때문이다.
--   2) 넣는 행에 order_status='filled' 와 filled_at 을 명시한다.

create or replace function public.apply_trade(
  p_user_id bigint,
  p_stock_code text,
  p_side text,
  p_price numeric,
  p_quantity numeric,
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
  v_balance  numeric;
  v_reserved numeric;
  v_qty      numeric;
  v_locked   numeric;
  v_avg      numeric;
  v_amount   numeric;
  v_realized integer := null;
  v_tx_id    uuid;
begin
  if p_side not in ('buy', 'sell') then
    raise exception '알 수 없는 주문 방향입니다: %', p_side;
  end if;
  if p_price is null or p_price <= 0 or p_quantity is null or p_quantity <= 0 then
    raise exception '가격과 수량은 0보다 커야 합니다.';
  end if;

  select stock_id into v_stock_id from stocks where stock_code = p_stock_code;
  if v_stock_id is null then
    raise exception '등록되지 않은 종목입니다: %', p_stock_code;
  end if;

  insert into account (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance, reserved_balance into v_balance, v_reserved
    from account where user_id = p_user_id for update;

  select quantity, reserved_quantity, avg_price into v_qty, v_locked, v_avg
    from holdings where user_id = p_user_id and stock_id = v_stock_id for update;
  v_qty    := coalesce(v_qty, 0);
  v_locked := coalesce(v_locked, 0);
  v_avg    := coalesce(v_avg, 0);

  v_amount := p_price * p_quantity;

  if p_side = 'buy' then
    -- 예약이 잡아 둔 현금은 쓸 수 없다.
    if v_balance - v_reserved < v_amount then
      raise exception '잔액이 부족합니다.';
    end if;
    v_balance := v_balance - v_amount;
    insert into holdings (user_id, stock_id, quantity, avg_price)
      values (p_user_id, v_stock_id, p_quantity, p_price)
      on conflict (user_id, stock_id) do update
        set avg_price  = (holdings.avg_price * holdings.quantity
                          + excluded.avg_price * excluded.quantity)
                         / (holdings.quantity + excluded.quantity),
            quantity   = holdings.quantity + excluded.quantity,
            updated_at = now();
  else
    -- 매도 예약이 잠근 수량도 쓸 수 없다.
    if v_qty - v_locked < p_quantity then
      raise exception '보유 수량이 부족합니다.';
    end if;
    v_balance := v_balance + v_amount;
    v_realized := round((p_price - v_avg) * p_quantity);
    if v_qty = p_quantity then
      delete from holdings where user_id = p_user_id and stock_id = v_stock_id;
    else
      update holdings set quantity = v_qty - p_quantity, updated_at = now()
        where user_id = p_user_id and stock_id = v_stock_id;
    end if;
  end if;

  update account set balance = v_balance where user_id = p_user_id;

  -- 매수 전용·매도 전용 필드는 반대쪽에서 들어와도 저장하지 않는다 (SPEC §7.1).
  insert into transactions
    (user_id, stock_id, side, trade_price, trade_quantity, trade_reason, realized_profit,
     plan_code, plan_target_price, memo, plan_match, plan_changed_reason,
     order_status, order_type, filled_at)
  values
    (p_user_id, v_stock_id, p_side, p_price, p_quantity, p_reason, v_realized,
     case when p_side = 'buy' then p_plan_code end,
     case when p_side = 'buy' then p_plan_target_price end,
     case when p_side = 'buy' then nullif(btrim(p_memo), '') end,
     case when p_side = 'sell' then p_plan_match end,
     case when p_side = 'sell' and p_plan_match is false then p_plan_changed_reason end,
     'filled', 'market', now())
  returning id into v_tx_id;

  return json_build_object(
    'transaction_id',  v_tx_id,
    'balance',         v_balance,
    'realized_profit', v_realized
  );
end;
$$;

-- ── 4. 예약 접수 — reserve_order ────────────────────────────────────────────
--
-- 지정가(pending)와 장외 시장가(scheduled)를 하나의 함수로 받는다. 둘의 차이는 체결
-- 트리거뿐이고(가격 도달 vs 다음 거래일 시가), 자원을 잠그는 방식은 같기 때문이다.
-- 화면과 같은 우선순위로 상태를 정한다: 지정가면 pending, 아니면 scheduled.

create function public.reserve_order(
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

  select stock_id into v_stock_id from stocks where stock_code = p_stock_code;
  if v_stock_id is null then
    raise exception '등록되지 않은 종목입니다: %', p_stock_code;
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

-- ── 5. 예약 정산 — settle_order ─────────────────────────────────────────────
--
-- 확인된 체결가 하나로 예약 주문을 끝낸다. 금액 매수는 예약 금액 전부를 그 가격의 소수
-- 수량으로 바꾸고, 수량 매수는 예약 금액을 넘으면 거절하고 현금을 통째로 돌려준다
-- (F2 SPEC 의 장외 예약 규칙 그대로).
--
-- 이미 끝난 주문(filled/cancelled/rejected)에는 아무것도 하지 않고 그 상태를 돌려준다.
-- 정산 배치가 같은 주문을 두 번 불러도 중복 체결되지 않게 하기 위해서다.

create function public.settle_order(
  p_order_id uuid,
  p_fill_price numeric
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order    transactions%rowtype;
  v_balance  numeric;
  v_reserved numeric;
  v_qty      numeric;
  v_locked   numeric;
  v_avg      numeric;
  v_fill_qty numeric;
  v_amount   numeric;
  v_realized integer := null;
begin
  select * into v_order from transactions where id = p_order_id for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다: %', p_order_id;
  end if;
  if v_order.order_status not in ('pending', 'scheduled') then
    -- 멱등: 이미 정산된 주문은 그대로 둔다.
    return json_build_object('order_id', v_order.id, 'order_status', v_order.order_status,
                             'settled', false);
  end if;
  if p_fill_price is null or p_fill_price <= 0 then
    raise exception '체결가는 0보다 커야 합니다.';
  end if;

  select balance, reserved_balance into v_balance, v_reserved
    from account where user_id = v_order.user_id for update;
  select quantity, reserved_quantity, avg_price into v_qty, v_locked, v_avg
    from holdings where user_id = v_order.user_id and stock_id = v_order.stock_id for update;
  v_qty    := coalesce(v_qty, 0);
  v_locked := coalesce(v_locked, 0);
  v_avg    := coalesce(v_avg, 0);

  if v_order.side = 'buy' then
    if v_order.request_mode = 'quantity' then
      v_fill_qty := v_order.requested_quantity;
      v_amount   := p_fill_price * v_fill_qty;
      -- 시가가 올라 예약 금액을 넘으면 체결하지 않고 현금을 전부 돌려준다.
      if v_amount > v_order.reserved_amount then
        update account set reserved_balance = v_reserved - v_order.reserved_amount
          where user_id = v_order.user_id;
        update transactions
          set order_status = 'rejected', rejected_at = now(),
              rejection_reason = 'reserved_amount_exceeded'
          where id = v_order.id;
        return json_build_object('order_id', v_order.id, 'order_status', 'rejected',
                                 'settled', true, 'rejection_reason', 'reserved_amount_exceeded');
      end if;
    else
      -- 금액 주문: 예약 금액을 남김없이 소수 수량으로 바꾼다.
      v_fill_qty := v_order.reserved_amount / p_fill_price;
      v_amount   := v_order.reserved_amount;
    end if;

    update account
      set balance = v_balance - v_amount,
          reserved_balance = v_reserved - v_order.reserved_amount
      where user_id = v_order.user_id;

    insert into holdings (user_id, stock_id, quantity, avg_price)
      values (v_order.user_id, v_order.stock_id, v_fill_qty, p_fill_price)
      on conflict (user_id, stock_id) do update
        set avg_price  = (holdings.avg_price * holdings.quantity
                          + excluded.avg_price * excluded.quantity)
                         / (holdings.quantity + excluded.quantity),
            quantity   = holdings.quantity + excluded.quantity,
            updated_at = now();
  else
    v_fill_qty := v_order.requested_quantity;
    -- 잠근 수량은 접수 때 확인했지만, 그 사이 다른 경로가 줄였을 수 있으니 다시 본다.
    if v_qty < v_fill_qty or v_locked < v_fill_qty then
      update holdings set reserved_quantity = greatest(v_locked - v_fill_qty, 0), updated_at = now()
        where user_id = v_order.user_id and stock_id = v_order.stock_id;
      update transactions
        set order_status = 'rejected', rejected_at = now(),
            rejection_reason = 'insufficient_shares'
        where id = v_order.id;
      return json_build_object('order_id', v_order.id, 'order_status', 'rejected',
                               'settled', true, 'rejection_reason', 'insufficient_shares');
    end if;
    v_amount   := p_fill_price * v_fill_qty;
    v_realized := round((p_fill_price - v_avg) * v_fill_qty);

    update account set balance = v_balance + v_amount where user_id = v_order.user_id;

    if v_qty = v_fill_qty then
      delete from holdings where user_id = v_order.user_id and stock_id = v_order.stock_id;
    else
      update holdings
        set quantity = v_qty - v_fill_qty,
            reserved_quantity = v_locked - v_fill_qty,
            updated_at = now()
        where user_id = v_order.user_id and stock_id = v_order.stock_id;
    end if;
  end if;

  update transactions
    set order_status = 'filled', filled_at = now(),
        trade_price = p_fill_price, trade_quantity = v_fill_qty,
        realized_profit = v_realized
    where id = v_order.id;

  return json_build_object('order_id', v_order.id, 'order_status', 'filled', 'settled', true,
                           'trade_price', p_fill_price, 'trade_quantity', v_fill_qty,
                           'realized_profit', v_realized);
end;
$$;

-- ── 6. 예약 취소 — cancel_order ─────────────────────────────────────────────
--
-- 잠근 자원만 풀고 총자산은 그대로 둔다. 남의 주문을 취소할 수 없게 user_id 를 함께 받는다.

create function public.cancel_order(
  p_order_id uuid,
  p_user_id bigint
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_order transactions%rowtype;
begin
  select * into v_order from transactions
    where id = p_order_id and user_id = p_user_id for update;
  if not found then
    raise exception '주문을 찾을 수 없습니다: %', p_order_id;
  end if;
  if v_order.order_status not in ('pending', 'scheduled') then
    return json_build_object('order_id', v_order.id, 'order_status', v_order.order_status,
                             'cancelled', false);
  end if;

  if v_order.side = 'buy' then
    update account
      set reserved_balance = greatest(reserved_balance - v_order.reserved_amount, 0)
      where user_id = v_order.user_id;
  else
    update holdings
      set reserved_quantity = greatest(reserved_quantity - v_order.requested_quantity, 0),
          updated_at = now()
      where user_id = v_order.user_id and stock_id = v_order.stock_id;
  end if;

  update transactions
    set order_status = 'cancelled', cancelled_at = now()
    where id = v_order.id;

  return json_build_object('order_id', v_order.id, 'order_status', 'cancelled', 'cancelled', true);
end;
$$;

commit;
