begin;

-- 079550 의 표시 이름을 짧은 공식 약칭으로 통일한다.
-- 풀네임(LIG디펜스앤에어로스페이스)은 종목 카드·홈 보유 카드에서 잘려 나왔고,
-- 같은 종목이 화면마다 세 이름(풀네임·LIG디펜스앤에어로·LIG넥스원)으로 보였다.
-- 이 표의 stock_name 은 홈 보유 카드·계좌·가족 피드·챗봇 보유 답변이 그대로 읽는다.
-- 검색 별칭(풀네임 한글·영문, 옛 이름)은 web/shared/data/stocks.ts 가 소유한다.
update public.stocks
  set stock_name = 'LIG D&A'
  where stock_code = '079550';

commit;
