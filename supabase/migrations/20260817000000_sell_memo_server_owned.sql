begin;

-- 매도 완료 화면의 한 줄 메모("하고 싶은 말이 있으면 남겨주세요 — 나중에 다시 보여줄게요")는
-- 지금까지 `kw_proto_v1.sellRecords` 에만 있었다. 아무도 다시 읽지 않았으므로 화면이 한
-- 약속이 지켜진 적이 없다. `transactions.memo` 에 담아 서버가 들고 있게 한다.
--
-- `apply_trade` 는 메모를 매수 전용으로 막아 둔다(SPEC §7.1). 매도 메모는 체결이 끝난
-- **뒤에** 완료 화면에서 적으므로 애초에 그 경로로는 들어올 수 없다 — 그래서 체결과 별개인
-- 갱신 함수를 따로 둔다.
create or replace function public.set_trade_memo(
  p_user_id bigint,
  p_transaction_id uuid,
  p_memo text
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  -- 남의 기록에 메모를 달 수 없다. 조건을 SQL 안에 두어 라우트가 빠뜨려도 막힌다.
  update transactions
     set memo = nullif(btrim(p_memo), '')
   where id = p_transaction_id
     and user_id = p_user_id
  returning id into v_id;

  if v_id is null then
    raise exception '기록을 찾을 수 없습니다: %', p_transaction_id;
  end if;

  return json_build_object('transaction_id', v_id);
end;
$$;

commit;
