-- 주문의 보유 계획·목표가·메모·계획 준수 여부·계획 변경 이유를 서버에도 남긴다.
--
-- 지금까지 이 값들은 localStorage(kw_proto_v1)에만 있었고 transactions 로는 trade_reason 만 갔다.
-- 그래서 서버 기록으로 카드를 다시 만드는 경로(GET /api/profile/season-cards)에서 계획과 메모가
-- 비었고, 매도의 계획 준수 여부를 알 수 없어 엔진 actionAlignment 가 항상 0 이었다.
-- 계약은 web/features/f2-trade/SPEC.md §7.1 이 단일 원본이다.
--
-- 확신도·자신감 수치는 어떤 형태로도 넣지 않는다 (F2 SPEC §5.4).

begin;

alter table public.transactions
  add column plan_code text,
  add column plan_target_price numeric,
  add column memo text,
  add column plan_match boolean,
  add column plan_changed_reason text;

-- 코드 목록은 화면 상수(web/ui-src/logic/constants.js)와 SPEC §5.2·§5.3 을 따른다.
alter table public.transactions
  add constraint transactions_plan_code_check
  check (plan_code is null or plan_code = any (array[
    'plan_short'::text, 'plan_season'::text, 'plan_target'::text, 'plan_none'::text
  ]));

alter table public.transactions
  add constraint transactions_plan_changed_reason_check
  check (plan_changed_reason is null or plan_changed_reason = any (array[
    'change_new_info'::text, 'change_view_shift'::text, 'change_price_emotion'::text,
    'change_alternative'::text, 'change_plan_revision'::text
  ]));

alter table public.transactions
  add constraint transactions_plan_target_price_check
  check (plan_target_price is null or plan_target_price > 0);

alter table public.transactions
  add constraint transactions_memo_check
  check (memo is null or char_length(btrim(memo)) between 1 and 200);

-- apply_trade 에 인자를 더한다.
--
-- create or replace 로는 인자 목록을 바꿀 수 없다. 그대로 두면 6인자 함수와 기본값이 붙은
-- 새 함수가 함께 남아 6인자 호출이 "function is not unique" 로 깨진다. 그래서 옛 시그니처를
-- 먼저 지운다. 새 인자는 모두 default null 이라 p_reason 까지만 보내는 옛 호출은 그대로 된다.
drop function if exists public.apply_trade(bigint, text, text, numeric, numeric, text);

create function public.apply_trade(
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
  v_qty      numeric;
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
  select balance into v_balance from account where user_id = p_user_id for update;

  select quantity, avg_price into v_qty, v_avg
    from holdings where user_id = p_user_id and stock_id = v_stock_id for update;
  v_qty := coalesce(v_qty, 0);
  v_avg := coalesce(v_avg, 0);

  v_amount := p_price * p_quantity;

  if p_side = 'buy' then
    if v_balance < v_amount then
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
    if v_qty < p_quantity then
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
     plan_code, plan_target_price, memo, plan_match, plan_changed_reason)
  values
    (p_user_id, v_stock_id, p_side, p_price, p_quantity, p_reason, v_realized,
     case when p_side = 'buy' then p_plan_code end,
     case when p_side = 'buy' then p_plan_target_price end,
     case when p_side = 'buy' then nullif(btrim(p_memo), '') end,
     case when p_side = 'sell' then p_plan_match end,
     case when p_side = 'sell' and p_plan_match is false then p_plan_changed_reason end)
  returning id into v_tx_id;

  return json_build_object(
    'transaction_id',  v_tx_id,
    'balance',         v_balance,
    'realized_profit', v_realized
  );
end;
$$;

commit;
