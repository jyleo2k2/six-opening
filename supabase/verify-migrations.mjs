// 빈 PostgreSQL 에 저장소 마이그레이션 전체를 순서대로 넣고, 주문 생애주기 RPC 를 실제로 돌린다.
// README "새 환경 검증" 절차를 Docker 없이 PGlite 로 대신한다.
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.argv[2];
const MIG = join(ROOT, "supabase", "migrations");

// README 가 적어 둔, supabase db reset 이 깔아 주는 최소 전제.
const BOOTSTRAP = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

const db = new PGlite();
let failed = 0;
const check = (name, cond, extra = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { failed++; console.log(`  FAIL ${name} ${extra}`); }
};
const near = (a, b, eps = 0.5) => Math.abs(Number(a) - Number(b)) < eps;

await db.exec(BOOTSTRAP);

const files = (await readdir(MIG)).filter((f) => f.endsWith(".sql")).sort();
console.log(`\n== 마이그레이션 ${files.length}건 (빈 DB) ==`);
for (const f of files) {
  try {
    await db.exec(await readFile(join(MIG, f), "utf8"));
    console.log(`  ok   ${f}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${f}\n       ${e.message}`);
  }
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const acct = (id) => one("select balance, reserved_balance from account where user_id=$1", [id]);
const hold = (id, sid) =>
  one("select quantity, reserved_quantity, avg_price from holdings where user_id=$1 and stock_id=$2", [id, sid]);

console.log("\n== 시드 결과 ==");
const profiles = await db.query("select id, login_id, guardian_role from profiles order by id");
check("profiles 3계정 생성", profiles.rows.length === 3, JSON.stringify(profiles.rows));
check("아빠 guardian_role=dad", profiles.rows[2]?.guardian_role === "dad");
const seeded = await db.query("select count(*)::int n from holdings where user_id in (1,2,3)");
check("포트폴리오 시드가 순서대로 걸렸다 (보유 11행)", seeded.rows[0].n === 11, `n=${seeded.rows[0].n}`);
const backfilled = await db.query(
  "select count(*)::int n from transactions where order_status='filled' and filled_at is null",
);
check("기존 체결행 filled_at 백필", backfilled.rows[0].n === 0);

// ── 즉시 체결 ──────────────────────────────────────────────────────────────
console.log("\n== apply_trade (즉시 체결) ==");
await db.exec("update account set balance = 1000000, reserved_balance = 0 where user_id = 1");
await db.exec("delete from holdings where user_id = 1");
await one("select apply_trade(1,'005930','buy',70000,2,'buy_news') r");
let a = await acct(1);
check("현금 차감 1,000,000 - 140,000", near(a.balance, 860000), `balance=${a.balance}`);
let h = await hold(1, 7);
check("보유 2주 적재", near(h.quantity, 2) && near(h.avg_price, 70000));
check(
  "order_status=filled 로 기록",
  (await one("select order_status, order_type from transactions where user_id=1 order by created_at desc limit 1"))
    .order_status === "filled",
);

// ── 매수 예약: 금액 모드 ────────────────────────────────────────────────────
console.log("\n== reserve_order 매수(금액) → settle_order ==");
const buyAmt = await one(
  `select reserve_order(1,'005930','buy','market',null,300000,'amount',null,current_date,'buy_chart',
                        'plan_short',null,'메모') r`,
);
const buyAmtId = buyAmt.r.order_id;
a = await acct(1);
check("예약이 현금을 잠근다 (balance 불변)", near(a.balance, 860000), `balance=${a.balance}`);
check("reserved_balance = 300,000", near(a.reserved_balance, 300000), `reserved=${a.reserved_balance}`);
check("상태 scheduled", buyAmt.r.order_status === "scheduled");

// 잠긴 현금은 즉시 주문이 못 쓴다.
let blocked = null;
try {
  await one("select apply_trade(1,'005930','buy',70000,9,'buy_news') r");
} catch (e) {
  blocked = e.message;
}
check("잠긴 현금은 즉시 주문이 쓸 수 없다", /잔액이 부족/.test(blocked || ""), blocked || "예외 없음");

const settledAmt = await one("select settle_order($1, 60000) r", [buyAmtId]);
a = await acct(1);
h = await hold(1, 7);
check("금액 주문은 예약 금액을 전부 소수 수량으로", near(settledAmt.r.trade_quantity, 5), `qty=${settledAmt.r.trade_quantity}`);
check("체결 후 현금 860,000 - 300,000", near(a.balance, 560000), `balance=${a.balance}`);
check("체결 후 잠금 해제", near(a.reserved_balance, 0), `reserved=${a.reserved_balance}`);
check("보유 2 + 5 = 7주", near(h.quantity, 7), `qty=${h.quantity}`);

// 같은 주문을 두 번 정산해도 중복 체결되지 않는다.
const again = await one("select settle_order($1, 60000) r", [buyAmtId]);
check("정산 멱등 (두 번째는 settled=false)", again.r.settled === false);
h = await hold(1, 7);
check("멱등 후 보유 불변 7주", near(h.quantity, 7), `qty=${h.quantity}`);

// ── 매수 예약: 수량 모드에서 시가 상승 → 거절 ──────────────────────────────
console.log("\n== 수량 모드 매수, 시가 상승 → 거절·환불 ==");
const before = (await acct(1)).balance;
const buyQty = await one(
  `select reserve_order(1,'005930','buy','market',null,100000,'quantity',1,current_date,'buy_hunch') r`,
);
const rejected = await one("select settle_order($1, 150000) r", [buyQty.r.order_id]);
a = await acct(1);
check("예약 금액 초과 시 거절", rejected.r.order_status === "rejected", JSON.stringify(rejected.r));
check("거절 사유 reserved_amount_exceeded", rejected.r.rejection_reason === "reserved_amount_exceeded");
check("현금 전액 환불 (총 현금 불변)", near(a.balance, before), `balance=${a.balance} before=${before}`);
check("잠금 해제", near(a.reserved_balance, 0), `reserved=${a.reserved_balance}`);

// ── 매도 예약과 취소 ────────────────────────────────────────────────────────
console.log("\n== reserve_order 매도 → 취소 (자산 총액 불변) ==");
const cashBefore = (await acct(1)).balance;
const sell = await one(
  `select reserve_order(1,'005930','sell','limit',80000,null,'quantity',3,null,'sell_target',
                        null,null,null,true) r`,
);
h = await hold(1, 7);
check("상태 pending (지정가)", sell.r.order_status === "pending");
check("보유 총량 불변 7주", near(h.quantity, 7), `qty=${h.quantity}`);
check("사용 가능 수량만 3주 잠김", near(h.reserved_quantity, 3), `reserved=${h.reserved_quantity}`);

let sellBlocked = null;
try {
  await one("select apply_trade(1,'005930','sell',70000,6,'sell_target') r");
} catch (e) {
  sellBlocked = e.message;
}
check("잠긴 수량은 즉시 매도가 쓸 수 없다", /보유 수량이 부족/.test(sellBlocked || ""), sellBlocked || "예외 없음");

await one("select cancel_order($1, 1) r", [sell.r.order_id]);
h = await hold(1, 7);
a = await acct(1);
check("취소로 잠금 해제", near(h.reserved_quantity, 0), `reserved=${h.reserved_quantity}`);
check("취소해도 보유 불변 7주", near(h.quantity, 7), `qty=${h.quantity}`);
check("취소해도 현금 불변", near(a.balance, cashBefore), `balance=${a.balance}`);
check(
  "상태 cancelled",
  (await one("select order_status from transactions where id=$1", [sell.r.order_id])).order_status === "cancelled",
);

// ── 매도 예약 정상 체결 ────────────────────────────────────────────────────
console.log("\n== 매도 예약 체결 ==");
const sell2 = await one(
  `select reserve_order(1,'005930','sell','market',null,null,'quantity',2,current_date,'sell_plan',
                        null,null,null,false,'change_new_info') r`,
);
const cash2 = (await acct(1)).balance;
const settledSell = await one("select settle_order($1, 90000) r", [sell2.r.order_id]);
a = await acct(1);
h = await hold(1, 7);
check("매도 체결 수량 2주", near(settledSell.r.trade_quantity, 2));
check("현금 += 90,000 × 2", near(a.balance, Number(cash2) + 180000), `balance=${a.balance}`);
check("보유 7 - 2 = 5주", near(h.quantity, 5), `qty=${h.quantity}`);
check("매도 잠금 해제", near(h.reserved_quantity, 0), `reserved=${h.reserved_quantity}`);
check("실현손익 기록", settledSell.r.realized_profit !== null, `realized=${settledSell.r.realized_profit}`);

// ── 남의 주문은 취소 못 한다 ────────────────────────────────────────────────
console.log("\n== 소유권 ==");
const mine = await one(
  `select reserve_order(1,'005930','sell','limit',99000,null,'quantity',1,null,'sell_target') r`,
);
let denied = null;
try {
  await one("select cancel_order($1, 2) r", [mine.r.order_id]);
} catch (e) {
  denied = e.message;
}
check("다른 사용자는 취소할 수 없다", /주문을 찾을 수 없습니다/.test(denied || ""), denied || "예외 없음");

// ── 제약이 실제로 막는지 ────────────────────────────────────────────────────
console.log("\n== 제약 ==");
let overReserve = null;
try {
  await db.exec("update account set reserved_balance = balance + 1 where user_id = 1");
} catch (e) {
  overReserve = e.message;
}
check("reserved_balance > balance 차단", /account_reserved_balance_check/.test(overReserve || ""), overReserve || "미차단");

let badStatus = null;
try {
  await db.exec("update transactions set order_status = 'weird' where user_id = 1");
} catch (e) {
  badStatus = e.message;
}
check("알 수 없는 order_status 차단", /transactions_order_status_check/.test(badStatus || ""), badStatus || "미차단");

console.log(failed === 0 ? "\n전부 통과" : `\n실패 ${failed}건`);
process.exit(failed === 0 ? 0 : 1);
