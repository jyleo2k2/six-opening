-- 거래내역에서 보유·잔액을 다시 내는 `rebuild_holdings(user_id)` 를 만든다.
--
-- **왜 필요한가.** 차트의 Buy/Sell 핀은 `transactions` 를 화면 열 때마다 새로 읽지만
-- (`GET /api/trades`), 홈의 `내 보유 종목` 은 `holdings` 를 읽는다(`GET /api/account`).
-- 두 표를 잇는 트리거도 뷰도 없고, `holdings` 를 쓰는 것은 `apply_trade`·`reserve_order`·
-- `settle_order`·`cancel_order` 네 함수뿐이다. 그래서 **Supabase 에서 거래내역만 손으로
-- 고치면 차트는 즉시 바뀌고 홈은 영원히 옛 값**이었다. 그때 이 함수를 한 번 부르면 된다.
--
--   select rebuild_holdings(1);   -- 김찬영
--
-- **트리거는 걸지 않는다.** 앱 주문 경로(위 네 함수)는 이미 두 표를 같이 움직이므로 자동
-- 재계산은 순수한 덤이고, 예약 잠금이 걸리는 도중에 끼어들면 순서가 꼬인다. 손으로 고쳤을
-- 때만 부르는 수동 도구로 둔다.
--
-- **`transactions` 하나로 전부 나온다.** 라이브 세 계정에 대해 아래 식이 지금 값을 그대로
-- 재현하는 것을 먼저 확인하고 넣었다 — 김찬영 341,800원, 찬영아빠 770,500원이 원 단위까지
-- 같았고, 찬영엄마만 소수 거래 반올림 탓에 0.003원 차이가 나 이 함수가 오히려 정리한다.
--
--   quantity           체결 매수 − 체결 매도
--   avg_price          매수는 가중평균, 매도는 평단 유지 (`apply_trade` 와 같은 규칙)
--   reserved_quantity  미체결 매도의 `requested_quantity` 합
--   balance            10,000,000 − 체결 매수금액 + 체결 매도금액
--   reserved_balance   미체결 매수의 `reserved_amount` 합
--
-- 고칠 대상이 없으면 조용히 아무것도 하지 않는다 — 없는 계정을 부르면 `rebuilt: false` 만
-- 돌려주고 끝난다(README "새 환경에서 도는지가 판단 기준").

begin;

create or replace function public.rebuild_holdings(p_user_id bigint)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- `GET /api/account` 의 `SEED_BALANCE` 와 같은 값이다. 계좌 행이 없을 때 화면이 보여 주는
  -- 최초 잔액이 여기서도 출발점이어야 두 곳이 같은 말을 한다.
  v_seed constant numeric := 10000000;
  v_stock   record;
  v_trade   record;
  v_qty     numeric;
  v_avg     numeric;
  v_locked  numeric;
  v_balance numeric;
  v_reserved numeric;
  v_rows    integer := 0;
begin
  if not exists (select 1 from profiles where id = p_user_id) then
    return json_build_object('user_id', p_user_id, 'rebuilt', false, 'holdings', 0);
  end if;

  insert into account (user_id) values (p_user_id) on conflict (user_id) do nothing;

  -- 계좌를 먼저 잠근다. 재계산 도중에 주문이 들어오면 방금 읽은 거래로 낸 값이 그 주문을
  -- 덮어쓴다 — `apply_trade` 가 같은 행을 `for update` 로 잡는 것과 같은 이유다.
  perform 1 from account where user_id = p_user_id for update;

  -- ── 보유 ────────────────────────────────────────────────────────────────────
  -- 종목별로 체결을 시간순으로 접는다. 남은 수량이 없으면 행을 만들지 않는다 —
  -- 다 판 종목이 `0주` 로 홈에 서 있으면 안 된다(`apply_trade` 도 그때 행을 지운다).
  delete from holdings where user_id = p_user_id;

  for v_stock in
    select distinct stock_id from transactions
    where user_id = p_user_id and order_status = 'filled'
  loop
    v_qty := 0;
    v_avg := 0;

    for v_trade in
      select side, trade_price, trade_quantity
      from transactions
      where user_id = p_user_id and stock_id = v_stock.stock_id and order_status = 'filled'
      -- 같은 시각의 두 건은 `id` 로 순서를 고정한다. 순서가 흔들리면 평단이 매번 달라진다.
      order by created_at, id
    loop
      if v_trade.side = 'buy' then
        v_avg := (v_avg * v_qty + v_trade.trade_price * v_trade.trade_quantity)
                 / (v_qty + v_trade.trade_quantity);
        v_qty := v_qty + v_trade.trade_quantity;
      else
        -- 매도는 평단을 바꾸지 않는다. 전량 매도면 평단도 함께 비운다.
        v_qty := v_qty - v_trade.trade_quantity;
        if v_qty <= 0 then
          v_qty := 0;
          v_avg := 0;
        end if;
      end if;
    end loop;

    if v_qty > 0 then
      -- 미체결 매도가 잠근 수량. 보유보다 클 수 없다 — 거래내역을 손으로 줄였는데 예약이
      -- 그대로면 팔 수 있는 수량이 음수가 된다.
      select least(coalesce(sum(requested_quantity), 0), v_qty) into v_locked
      from transactions
      where user_id = p_user_id and stock_id = v_stock.stock_id
        and side = 'sell' and order_status in ('pending', 'scheduled');

      -- `updated_at` 은 now() 가 아니라 **그 종목을 마지막으로 건드린 거래 시각**이다.
      -- 홈 카드는 `/api/account` 가 준 순서대로 앞 세 줄만 세우고 그 순서가
      -- `updated_at desc` 이므로(PR #352), now() 로 채우면 전 종목이 같은 시각이 되어
      -- 카드에 무엇이 서는지가 다시 운에 맡겨진다.
      insert into holdings (user_id, stock_id, quantity, avg_price, reserved_quantity, updated_at)
      values (
        p_user_id, v_stock.stock_id, v_qty, v_avg, coalesce(v_locked, 0),
        (select max(created_at) from transactions
         where user_id = p_user_id and stock_id = v_stock.stock_id)
      );
      v_rows := v_rows + 1;
    end if;
  end loop;

  -- ── 현금 ────────────────────────────────────────────────────────────────────
  -- `balance` 는 총 현금이고 예약이 잠근 몫까지 포함한다. 예약은 잠그기만 할 뿐 잔액을
  -- 줄이지 않으므로(`reserve_order`), 체결분만 세면 된다.
  select v_seed
       - coalesce(sum(trade_price * trade_quantity) filter (where side = 'buy'), 0)
       + coalesce(sum(trade_price * trade_quantity) filter (where side = 'sell'), 0)
    into v_balance
  from transactions
  where user_id = p_user_id and order_status = 'filled';

  select coalesce(sum(reserved_amount), 0) into v_reserved
  from transactions
  where user_id = p_user_id and side = 'buy' and order_status in ('pending', 'scheduled');

  update account
    set balance = greatest(v_balance, 0),
        reserved_balance = least(coalesce(v_reserved, 0), greatest(v_balance, 0))
  where user_id = p_user_id;

  return json_build_object(
    'user_id', p_user_id,
    'rebuilt', true,
    'holdings', v_rows,
    'balance', greatest(v_balance, 0),
    'reserved_balance', least(coalesce(v_reserved, 0), greatest(v_balance, 0))
  );
end;
$$;

-- 앱 서버는 서비스 키로 붙는다. 나머지 RPC 와 같은 실행 권한을 준다.
grant execute on function public.rebuild_holdings(bigint) to anon, authenticated, service_role;

commit;
